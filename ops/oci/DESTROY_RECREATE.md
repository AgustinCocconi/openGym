# OCI replacement and teardown runbook

These procedures are intentionally manual. Never destroy or replace production
from an unattended workflow.

## Replace only the VM

Use this when compute must be recreated while keeping the persistent volume.

1. Stop changes to the application.
2. Create a consistent local backup with `ops/backup-production.sh`.
3. Copy that archive and checksum to the approved encrypted external target.
4. Restore the archive into an isolated directory and verify its checksum.
5. Confirm the data volume OCID with `terraform output data_volume_id`.
6. The instance also has `prevent_destroy = true`; a replacement plan is
   deliberately blocked. Prepare a separately reviewed change that temporarily
   removes only the instance guard. Never remove the volume guard. Then produce,
   save and review a replacement plan:

   ```bash
   terraform plan -replace=oci_core_instance.opengym -out=replace-vm.tfplan
   terraform show replace-vm.tfplan
   ```

7. Verify only intended compute/attachment changes and no replacement or
   destruction of `oci_core_volume.data`. Approval must cover the guard change and
   the exact saved replacement plan; do not bypass it with state removal.
8. Restore the instance guard after the approved replacement and verify a
   normal plan has no changes. Verify the same volume OCID, `/srv` mount, filesystem
   marker, Docker and `cloudflared` before starting openGym.
9. Run the deployment and read-only smoke checks from the production runbook.

## Preserve the volume while removing compute/networking

Both the instance and data volume have `prevent_destroy = true`. Removing
compute requires explicit teardown approval and a separately reviewed change
to the instance guard. Keep the volume guard. Create and review a targeted
plan for compute, attachment, Bastion and networking that leaves
`oci_core_volume.data` managed and intact. Targeting does not bypass
`prevent_destroy`. Do not remove the volume from state unless ownership is
being deliberately transferred to another reviewed Terraform stack.

## Permanently destroy the data volume

Only after all of the following are true:

- the owner explicitly authorizes permanent deletion;
- a fresh encrypted external backup and checksum exist;
- an isolated restore test passed;
- the exact volume OCID was checked in the OCI console and Terraform state.

Then remove `prevent_destroy = true` in a separately reviewed change, create a
saved destroy plan and inspect it before any apply. Deleting the volume is
irreversible after OCI's recovery windows expire.

Never use broad recursive deletion commands against `/srv`, the checkout or a
backup root as part of infrastructure teardown.
