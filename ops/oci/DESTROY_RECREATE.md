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
6. Produce, save and review a replacement plan:

   ```bash
   terraform plan -replace=oci_core_instance.opengym -out=replace-vm.tfplan
   terraform show replace-vm.tfplan
   ```

7. Verify that `oci_core_volume.data` is not replaced or destroyed. Applying
   the reviewed plan requires explicit approval.
8. After replacement, verify the same volume OCID, `/srv` mount, filesystem
   marker, Docker and `cloudflared` before starting openGym.
9. Run the deployment and read-only smoke checks from the production runbook.

## Preserve the volume while removing compute/networking

The data volume has `prevent_destroy = true`, so a full destroy is blocked.
Create and review a targeted plan that removes compute, attachment, Bastion and
network resources but leaves `oci_core_volume.data` managed and intact. Do not
remove the volume from state unless ownership is being deliberately transferred
to another reviewed Terraform stack.

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
