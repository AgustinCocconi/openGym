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
    condition = (
      oci_core_instance.opengym.shape == "VM.Standard.A1.Flex" &&
      oci_core_instance.opengym.shape_config[0].ocpus == 1 &&
      oci_core_instance.opengym.shape_config[0].memory_in_gbs == 2
    )
    error_message = "The instance must remain on the approved A1 1 OCPU / 2 GB envelope."
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
      var.public_hostname == "gym.mientrenadorpersonal.com.ar" &&
      can(yamldecode(base64decode(oci_core_instance.opengym.metadata.user_data))) &&
      strcontains(
        base64decode(oci_core_instance.opengym.metadata.user_data),
        "Tunnel credentials were intentionally not installed."
      ) &&
      !strcontains(
        base64decode(oci_core_instance.opengym.metadata.user_data),
        "TUNNEL_TOKEN"
      )
    )
    error_message = "cloud-init must use the final hostname and remain free of Tunnel credentials."
  }
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
