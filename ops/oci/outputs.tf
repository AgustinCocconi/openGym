output "availability_domain" {
  description = "Availability domain selected for compute and block storage."
  value       = local.availability_domain
}

output "selected_image_ocid" {
  description = "Ubuntu AMD64 image selected by the reviewed plan. Record it with the deployment evidence."
  value       = local.selected_image_ocid
}

output "instance_id" {
  description = "OCI compute instance OCID."
  value       = oci_core_instance.opengym.id
}

output "instance_private_ip" {
  description = "Private IP used by OCI Bastion."
  value       = oci_core_instance.opengym.private_ip
}

output "instance_public_ip" {
  description = "Ephemeral egress IP. No public ingress rule targets it."
  value       = oci_core_instance.opengym.public_ip
}

output "bastion_id" {
  description = "OCI Bastion OCID used to create time-limited managed SSH sessions."
  value       = oci_bastion_bastion.opengym.id
}

output "bastion_private_endpoint_ip" {
  description = "Only source allowed to reach TCP/22 on the instance."
  value       = oci_bastion_bastion.opengym.private_endpoint_ip_address
}

output "data_volume_id" {
  description = "Protected persistent volume OCID."
  value       = oci_core_volume.data.id
}

output "data_volume_device" {
  description = "Consistent OCI device path configured for the persistent volume."
  value       = local.data_device
}

output "persistent_mount_point" {
  description = "Mount containing the checkout, application data and local backups."
  value       = local.mount_point
}

output "public_hostname" {
  description = "Final Cloudflare hostname; Terraform does not create its DNS record or tunnel."
  value       = var.public_hostname
}

output "bastion_session_command_template" {
  description = "Non-secret template. Replace the public-key path locally; OCI returns the final SSH command after session creation."
  value       = "oci bastion session create-managed-ssh --bastion-id ${oci_bastion_bastion.opengym.id} --target-resource-id ${oci_core_instance.opengym.id} --target-os-username ${local.operator_user} --ssh-public-key-file <PUBLIC_KEY_PATH> --session-ttl ${var.bastion_max_session_ttl_seconds}"
}
