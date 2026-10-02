mock_provider "oci" {
  override_during = plan
}

override_data {
  target = data.oci_identity_availability_domains.home
  values = {
    availability_domains = [
      {
        compartment_id = "ocid1.tenancy.oc1..test"
        id             = "ocid1.availabilitydomain.oc1..test"
        name           = "XOZR:SA-VINHEDO-1-AD-1"
      }
    ]
  }
}

override_resource {
  target          = oci_bastion_bastion.opengym
  override_during = plan
  values = {
    id                          = "ocid1.bastion.oc1.sa-vinhedo-1.test"
    private_endpoint_ip_address = "10.42.10.5"
  }
}

variables {
  tenancy_ocid     = "ocid1.tenancy.oc1..test"
  compartment_ocid = "ocid1.compartment.oc1..test"
  ssh_public_key   = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITestKeyOnly opengym-test"

  bastion_client_cidr_blocks = ["198.51.100.10/32"]
  image_ocid                 = "ocid1.image.oc1.sa-vinhedo-1.test"
}

run "plans_zero_cost_guardrails" {
  command = plan

  assert {
    condition     = oci_bastion_bastion.opengym.bastion_type == "STANDARD"
    error_message = "Bastion type must match OCI's normalized state value to avoid forced replacement."
  }

  assert {
    condition     = oci_core_instance.opengym.shape == "VM.Standard.E2.1.Micro"
    error_message = "The instance must remain on the approved Always Free E2.1.Micro shape."
  }

  assert {
    condition = (
      tonumber(oci_core_instance.opengym.source_details[0].boot_volume_size_in_gbs) == 50 &&
      tonumber(oci_core_volume.data.size_in_gbs) == 50
    )
    error_message = "Boot and persistent storage must remain at 50 GB each."
  }

  assert {
    condition = (
      oci_core_subnet.opengym.prohibit_public_ip_on_vnic == false &&
      oci_core_network_security_group_security_rule.ingress_bastion_ssh.source == "10.42.10.5/32"
    )
    error_message = "The VM needs egress through an ephemeral IP while SSH stays restricted to Bastion."
  }

  assert {
    condition = (
      length(oci_core_security_list.no_default_access.egress_security_rules) == 1 &&
      alltrue([
        for rule in oci_core_security_list.no_default_access.egress_security_rules :
        rule.destination == local.subnet_cidr &&
        rule.destination_type == "CIDR_BLOCK" &&
        rule.protocol == "6" &&
        rule.stateless == false &&
        length(rule.tcp_options) == 1 &&
        rule.tcp_options[0].min == 22 &&
        rule.tcp_options[0].max == 22
      ])
    )
    error_message = "The shared subnet must allow only TCP/22 egress for Bastion-to-target SSH traffic."
  }

  assert {
    condition = (
      var.public_hostname == "gym.mientrenadorpersonal.com.ar" &&
      can(yamldecode(base64decode(oci_core_instance.opengym.metadata.user_data))) &&
      strcontains(
        base64decode(oci_core_instance.opengym.metadata.user_data),
        "Tunnel credentials were intentionally not installed."
      ) &&
      strcontains(
        base64decode(oci_core_instance.opengym.metadata.user_data),
        "Architectures: amd64"
      ) &&
      strcontains(
        base64decode(oci_core_instance.opengym.metadata.user_data),
        "fallocate -l 1024M /swapfile"
      ) &&
      strcontains(
        base64decode(oci_core_instance.opengym.metadata.user_data),
        "swapoff /swapfile"
      ) &&
      strcontains(
        base64decode(oci_core_instance.opengym.metadata.user_data),
        "mount \"$mount_point\" || mountpoint -q \"$mount_point\""
      ) &&
      !strcontains(
        base64decode(oci_core_instance.opengym.metadata.user_data),
        "TUNNEL_TOKEN"
      )
    )
    error_message = "cloud-init must use the final hostname and remain free of Tunnel credentials."
  }
}

run "rejects_compute_drift" {
  command = plan

  variables {
    instance_shape = "VM.Standard.A1.Flex"
  }

  expect_failures = [var.instance_shape]
}

run "rejects_storage_drift" {
  command = plan

  variables {
    data_volume_size_gbs = 51
  }

  expect_failures = [var.data_volume_size_gbs]
}

run "rejects_region_drift" {
  command = plan

  variables {
    region = "sa-saopaulo-1"
  }

  expect_failures = [var.region]
}
