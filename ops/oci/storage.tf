resource "oci_core_volume" "data" {
  availability_domain  = local.availability_domain
  compartment_id       = var.compartment_ocid
  display_name         = "opengym-personal-data"
  size_in_gbs          = var.data_volume_size_gbs
  vpus_per_gb          = 10
  is_auto_tune_enabled = false
  freeform_tags        = local.common_tags

  lifecycle {
    prevent_destroy = true

    precondition {
      condition     = var.boot_volume_size_gbs + var.data_volume_size_gbs <= 100
      error_message = "Boot and data volumes together must not exceed the compartment guardrail of 100 GB."
    }
  }
}

resource "oci_core_volume_attachment" "data" {
  attachment_type                     = "paravirtualized"
  instance_id                         = oci_core_instance.opengym.id
  volume_id                           = oci_core_volume.data.id
  device                              = local.data_device
  display_name                        = "opengym-personal-data"
  is_pv_encryption_in_transit_enabled = true
  is_read_only                        = false
  is_shareable                        = false
}
