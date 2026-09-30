resource "oci_core_instance" "opengym" {
  availability_domain = local.availability_domain
  compartment_id      = var.compartment_ocid
  display_name        = "opengym-personal"
  shape               = var.instance_shape
  freeform_tags       = local.common_tags

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gbs
  }

  source_details {
    source_type             = "image"
    source_id               = local.selected_image_ocid
    boot_volume_size_in_gbs = var.boot_volume_size_gbs
    boot_volume_vpus_per_gb = 10
  }

  create_vnic_details {
    assign_private_dns_record = true
    assign_public_ip          = true
    display_name              = "opengym-personal-primary"
    hostname_label            = "gym"
    nsg_ids                   = [oci_core_network_security_group.instance.id]
    subnet_id                 = oci_core_subnet.opengym.id
  }

  agent_config {
    are_all_plugins_disabled = false
    is_management_disabled   = false
    is_monitoring_disabled   = false

    plugins_config {
      desired_state = "ENABLED"
      name          = "Bastion"
    }
  }

  availability_config {
    is_live_migration_preferred = true
    recovery_action             = "RESTORE_INSTANCE"
  }

  instance_options {
    are_legacy_imds_endpoints_disabled = true
  }

  is_pv_encryption_in_transit_enabled = true
  preserve_boot_volume                = false

  metadata = {
    ssh_authorized_keys = trimspace(var.ssh_public_key)
    user_data = base64encode(templatefile("${path.module}/cloud-init.yaml.tftpl", {
      bastion_private_ip = oci_bastion_bastion.opengym.private_endpoint_ip_address
      data_device        = local.data_device
      mount_point        = local.mount_point
      operator_user      = local.operator_user
      public_hostname    = var.public_hostname
    }))
  }

  depends_on = [
    oci_core_network_security_group_security_rule.ingress_bastion_ssh,
    oci_core_network_security_group_security_rule.egress_http,
    oci_core_network_security_group_security_rule.egress_https,
    oci_core_network_security_group_security_rule.egress_cloudflared_tcp,
    oci_core_network_security_group_security_rule.egress_cloudflared_udp,
    oci_core_network_security_group_security_rule.egress_dns_udp,
    oci_core_network_security_group_security_rule.egress_dns_tcp,
    oci_core_network_security_group_security_rule.egress_ntp
  ]

  lifecycle {
    precondition {
      condition     = local.availability_domain != null
      error_message = "The requested availability domain was not found in the home region."
    }

    precondition {
      condition     = local.selected_image_ocid != null
      error_message = "No compatible Ubuntu 24.04 ARM64 platform image was found; set image_ocid explicitly after reviewing an eligible image."
    }

    precondition {
      condition = (
        var.instance_shape == "VM.Standard.A1.Flex" &&
        var.instance_ocpus == 1 &&
        var.instance_memory_gbs == 2
      )
      error_message = "Compute exceeds or differs from the approved Always Free guardrail."
    }
  }

  timeouts {
    create = "30m"
  }
}
