resource "oci_core_instance" "opengym" {
  availability_domain = local.availability_domain
  compartment_id      = var.compartment_ocid
  display_name        = "opengym-personal"
  shape               = var.instance_shape
  freeform_tags       = local.common_tags

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
      docker_arch        = "amd64"
      mount_point        = local.mount_point
      operator_user      = local.operator_user
      public_hostname    = var.public_hostname
      swap_size_mib      = 1024
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
    # user_data is a first-boot contract. OCI replaces the instance when it
    # changes, so existing hosts are remediated explicitly and future hosts use
    # the latest template without risking an accidental destroy/recreate.
    ignore_changes  = [metadata["user_data"]]
    prevent_destroy = true

    precondition {
      condition     = local.availability_domain != null
      error_message = "The requested availability domain was not found in the home region."
    }

    precondition {
      condition     = local.selected_image_ocid != null
      error_message = "No compatible Ubuntu 24.04 AMD64 platform image was found; set image_ocid explicitly after reviewing an eligible image."
    }

    precondition {
      condition     = var.instance_shape == "VM.Standard.E2.1.Micro"
      error_message = "Compute differs from the approved Always Free E2.1.Micro guardrail."
    }
  }

  timeouts {
    create = "30m"
  }
}
