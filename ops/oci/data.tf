data "oci_identity_availability_domains" "home" {
  compartment_id = var.tenancy_ocid
}

data "oci_core_images" "ubuntu_arm64" {
  count = var.image_ocid == null ? 1 : 0

  compartment_id           = var.tenancy_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = var.instance_shape
  state                    = "AVAILABLE"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

locals {
  availability_domain = try(
    data.oci_identity_availability_domains.home.availability_domains[var.availability_domain_index].name,
    null
  )
  selected_image_ocid = var.image_ocid != null ? var.image_ocid : try(
    data.oci_core_images.ubuntu_arm64[0].images[0].id,
    null
  )

  common_tags = merge(
    {
      Environment = "personal-production"
      ManagedBy   = "Terraform"
      Project     = "openGym"
    },
    var.freeform_tags
  )

  data_device   = "/dev/oracleoci/oraclevdb"
  mount_point   = "/srv"
  operator_user = "ubuntu"
  vcn_cidr      = "10.42.0.0/16"
  subnet_cidr   = "10.42.10.0/24"
}
