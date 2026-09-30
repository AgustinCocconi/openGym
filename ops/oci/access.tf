resource "oci_bastion_bastion" "opengym" {
  bastion_type                 = "standard"
  compartment_id               = var.compartment_ocid
  target_subnet_id             = oci_core_subnet.opengym.id
  client_cidr_block_allow_list = var.bastion_client_cidr_blocks
  max_session_ttl_in_seconds   = var.bastion_max_session_ttl_seconds
  name                         = "opengym-personal"
  dns_proxy_status             = "DISABLED"
  freeform_tags                = local.common_tags
}

resource "oci_core_network_security_group_security_rule" "ingress_bastion_ssh" {
  network_security_group_id = oci_core_network_security_group.instance.id
  direction                 = "INGRESS"
  source                    = "${oci_bastion_bastion.opengym.private_endpoint_ip_address}/32"
  source_type               = "CIDR_BLOCK"
  protocol                  = "6"
  description               = "SSH only from the managed OCI Bastion private endpoint"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}
