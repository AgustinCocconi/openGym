resource "oci_core_vcn" "opengym" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = [local.vcn_cidr]
  display_name   = "opengym-personal-vcn"
  dns_label      = "opengym"
  freeform_tags  = local.common_tags
}

resource "oci_core_internet_gateway" "opengym" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.opengym.id
  display_name   = "opengym-personal-internet-gateway"
  enabled        = true
  freeform_tags  = local.common_tags
}

resource "oci_core_route_table" "public_egress" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.opengym.id
  display_name   = "opengym-personal-public-egress"
  freeform_tags  = local.common_tags

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.opengym.id
  }
}

resource "oci_core_security_list" "no_default_access" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.opengym.id
  display_name   = "opengym-personal-no-default-access"
  freeform_tags  = local.common_tags

  # OCI Bastion's private endpoint is attached to this subnet, so the subnet
  # security list must let it initiate SSH traffic. The instance NSG and UFW
  # still restrict inbound TCP/22 to the Bastion endpoint's exact /32 address.
  egress_security_rules {
    destination      = local.subnet_cidr
    destination_type = "CIDR_BLOCK"
    protocol         = "6"
    stateless        = false
    description      = "Bastion private endpoint to SSH targets in this subnet"

    tcp_options {
      min = 22
      max = 22
    }
  }
}

resource "oci_core_subnet" "opengym" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.opengym.id
  cidr_block                 = local.subnet_cidr
  display_name               = "opengym-personal-subnet"
  dns_label                  = "app"
  prohibit_internet_ingress  = false
  prohibit_public_ip_on_vnic = false
  route_table_id             = oci_core_route_table.public_egress.id
  security_list_ids          = [oci_core_security_list.no_default_access.id]
  freeform_tags              = local.common_tags
}

resource "oci_core_network_security_group" "instance" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.opengym.id
  display_name   = "opengym-personal-instance"
  freeform_tags  = local.common_tags
}

resource "oci_core_network_security_group_security_rule" "egress_http" {
  network_security_group_id = oci_core_network_security_group.instance.id
  direction                 = "EGRESS"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  protocol                  = "6"
  description               = "OS package repositories that still redirect over HTTP"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

resource "oci_core_network_security_group_security_rule" "egress_https" {
  network_security_group_id = oci_core_network_security_group.instance.id
  direction                 = "EGRESS"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  protocol                  = "6"
  description               = "HTTPS for updates, Git, registries, Cloudflare and provider APIs"

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_network_security_group_security_rule" "egress_cloudflared_tcp" {
  network_security_group_id = oci_core_network_security_group.instance.id
  direction                 = "EGRESS"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  protocol                  = "6"
  description               = "Cloudflare Tunnel HTTP2 transport"

  tcp_options {
    destination_port_range {
      min = 7844
      max = 7844
    }
  }
}

resource "oci_core_network_security_group_security_rule" "egress_cloudflared_udp" {
  network_security_group_id = oci_core_network_security_group.instance.id
  direction                 = "EGRESS"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  protocol                  = "17"
  description               = "Cloudflare Tunnel QUIC transport"

  udp_options {
    destination_port_range {
      min = 7844
      max = 7844
    }
  }
}

resource "oci_core_network_security_group_security_rule" "egress_dns_udp" {
  network_security_group_id = oci_core_network_security_group.instance.id
  direction                 = "EGRESS"
  destination               = "169.254.169.254/32"
  destination_type          = "CIDR_BLOCK"
  protocol                  = "17"
  description               = "OCI VCN DNS resolver"

  udp_options {
    destination_port_range {
      min = 53
      max = 53
    }
  }
}

resource "oci_core_network_security_group_security_rule" "egress_dns_tcp" {
  network_security_group_id = oci_core_network_security_group.instance.id
  direction                 = "EGRESS"
  destination               = "169.254.169.254/32"
  destination_type          = "CIDR_BLOCK"
  protocol                  = "6"
  description               = "OCI VCN DNS resolver fallback"

  tcp_options {
    destination_port_range {
      min = 53
      max = 53
    }
  }
}

resource "oci_core_network_security_group_security_rule" "egress_ntp" {
  network_security_group_id = oci_core_network_security_group.instance.id
  direction                 = "EGRESS"
  destination               = "169.254.169.254/32"
  destination_type          = "CIDR_BLOCK"
  protocol                  = "17"
  description               = "OCI local NTP service"

  udp_options {
    destination_port_range {
      min = 123
      max = 123
    }
  }
}

resource "oci_core_network_security_group_security_rule" "ingress_path_mtu" {
  network_security_group_id = oci_core_network_security_group.instance.id
  direction                 = "INGRESS"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"
  protocol                  = "1"
  description               = "ICMP fragmentation-needed responses for path MTU discovery"

  icmp_options {
    type = 3
    code = 4
  }
}
