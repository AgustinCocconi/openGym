# OCI infrastructure for personal production

This directory describes the single `personal` production host. It is designed
for the confirmed OCI home region `sa-vinhedo-1` and the final hostname
`gym.mientrenadorpersonal.com.ar`.

It does not create Cloudflare DNS records, Tunnel credentials, application
secrets, passkeys or production data. Never place any of those values in
Terraform variables, plans, state or cloud-init.

## Architecture

- One `VM.Standard.A1.Flex` ARM64 instance with exactly 1 OCPU and 2 GB RAM.
- A 50 GB boot volume and a protected 50 GB persistent block volume.
- The persistent volume mounts at `/srv`; the checkout and local backups live
  at `/srv/opengym` and `/srv/opengym-backups`.
- A regional public subnet gives the VM outbound access through one ephemeral
  public IP and an Internet Gateway. No NAT Gateway or load balancer is created.
- No public TCP/UDP ingress is allowed. TCP/22 accepts traffic only from the
  private endpoint of OCI Bastion. The public IP is used only for egress.
- Outbound rules cover DNS/NTP, HTTP/HTTPS and Cloudflare Tunnel on TCP/UDP
  7844. Cloudflare remains the only application entry path.
- OCI Bastion is managed, time-limited and restricted to operator CIDRs. No
  permanent public SSH rule exists.
- Ubuntu 24.04 ARM64 receives Docker Engine, Compose, Git and `cloudflared`
  through idempotent cloud-init. The Tunnel token is deliberately absent.

The public subnet is intentional: it avoids introducing a NAT Gateway while
still allowing updates and Tunnel egress. Defense in depth comes from an empty
subnet security list, a restrictive NSG, UFW and binding openGym to loopback.

## Guardrails

Terraform rejects a different region, shape, CPU, memory, hostname or storage
envelope. The persistent volume has `prevent_destroy = true`; a normal
`terraform destroy` must fail before deleting it. Follow
`DESTROY_RECREATE.md` for any replacement or teardown.

`terraform.tfvars`, state, saved plans and crash logs are ignored. State still
contains infrastructure identifiers and user-data, so keep it only on an
encrypted trusted device and back it up securely.

## Authentication

Use a local OCI CLI profile or another supported OCI provider authentication
method. Do not add tenancy credentials, API private keys or session tokens to
this directory. Only these non-secret deployment inputs belong in the local
`terraform.tfvars`:

- tenancy OCID;
- existing `opengym-personal` compartment OCID;
- an SSH **public** key;
- the operator's current narrow public CIDR, normally one IPv4 `/32`.

Copy the example and replace placeholders locally:

```bash
cd ops/oci
cp terraform.tfvars.example terraform.tfvars
```

Never use `0.0.0.0/0` for the Bastion allowlist.

## Validation and reviewed plan

P3 permits formatting, initialization without a backend, validation and a
read-only plan. It does not authorize apply:

```bash
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
terraform plan -out=opengym.tfplan
terraform show opengym.tfplan
```

Before approving an apply, verify that the plan contains only:

- one VCN, Internet Gateway, route table, subnet and empty security list;
- one instance NSG with the documented rules;
- one OCI Bastion;
- one A1 instance at 1 OCPU / 2 GB;
- 50 GB boot plus 50 GB protected data volume and its attachment;
- no NAT Gateway, load balancer, DNS record, Cloudflare token or secret.

Record the selected platform image OCID and save the reviewed plan securely.
Applying or destroying infrastructure requires a separate explicit approval.

## After a future apply

Do not continue until all of these checks pass through an OCI Bastion session:

```bash
cloud-init status --wait
sudo systemctl status opengym-data-volume.service --no-pager
findmnt /srv
test -f /srv/.opengym-data-volume
docker --version
docker compose version
cloudflared --version
sudo ufw status verbose
```

The Tunnel token is installed manually only in phase 5. Do not paste it into a
shell history, chat, Git, Terraform, cloud-init or a saved plan.

## Official references

- OCI Always Free resources:
  <https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm>
- OCI Bastion architecture and cost:
  <https://docs.oracle.com/en/solutions/use-bastion-service/index.html>
- Consistent block-volume device paths:
  <https://docs.oracle.com/en-us/iaas/Content/Block/References/consistentdevicepaths.htm>
- OCI Terraform provider:
  <https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/>
- Cloudflare Tunnel firewall requirements:
  <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/>
- Docker Engine on Ubuntu:
  <https://docs.docker.com/engine/install/ubuntu/>
