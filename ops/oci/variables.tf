variable "region" {
  description = "OCI home region. Always Free compute must stay in the tenancy home region."
  type        = string
  default     = "sa-vinhedo-1"

  validation {
    condition     = var.region == "sa-vinhedo-1"
    error_message = "This stack is intentionally locked to the confirmed home region sa-vinhedo-1."
  }
}

variable "tenancy_ocid" {
  description = "Tenancy OCID used only to discover platform images and availability domains."
  type        = string

  validation {
    condition     = can(regex("^ocid1\\.tenancy\\.", var.tenancy_ocid))
    error_message = "tenancy_ocid must be an OCI tenancy OCID."
  }
}

variable "compartment_ocid" {
  description = "OCID of the existing opengym-personal compartment."
  type        = string

  validation {
    condition     = can(regex("^ocid1\\.compartment\\.", var.compartment_ocid))
    error_message = "compartment_ocid must be an OCI compartment OCID."
  }
}

variable "ssh_public_key" {
  description = "Public SSH key for break-glass and OCI Bastion sessions. Never provide a private key."
  type        = string
  sensitive   = true

  validation {
    condition = anytrue([
      startswith(trimspace(var.ssh_public_key), "ssh-ed25519 "),
      startswith(trimspace(var.ssh_public_key), "ssh-rsa "),
      startswith(trimspace(var.ssh_public_key), "sk-ssh-ed25519@openssh.com "),
      startswith(trimspace(var.ssh_public_key), "ecdsa-sha2-nistp256 ")
    ])
    error_message = "ssh_public_key must contain one public OpenSSH key."
  }
}

variable "bastion_client_cidr_blocks" {
  description = "Narrow public CIDRs allowed to create Bastion sessions, normally the operator's current IPv4 /32."
  type        = list(string)

  validation {
    condition = (
      length(var.bastion_client_cidr_blocks) > 0 &&
      alltrue([
        for cidr in var.bastion_client_cidr_blocks :
        can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
      ])
    )
    error_message = "Provide at least one valid narrow IPv4 CIDR; 0.0.0.0/0 is forbidden."
  }
}

variable "bastion_max_session_ttl_seconds" {
  description = "Maximum lifetime of an OCI Bastion session."
  type        = number
  default     = 3600

  validation {
    condition = (
      var.bastion_max_session_ttl_seconds >= 1800 &&
      var.bastion_max_session_ttl_seconds <= 10800
    )
    error_message = "OCI Bastion session TTL must be between 1800 and 10800 seconds."
  }
}

variable "availability_domain_index" {
  description = "Zero-based availability-domain index. Vinhedo currently exposes one AD, so keep 0."
  type        = number
  default     = 0

  validation {
    condition     = var.availability_domain_index == 0
    error_message = "This personal stack is locked to availability-domain index 0."
  }
}

variable "instance_shape" {
  description = "Always Free ARM64 shape."
  type        = string
  default     = "VM.Standard.A1.Flex"

  validation {
    condition     = var.instance_shape == "VM.Standard.A1.Flex"
    error_message = "Only VM.Standard.A1.Flex is allowed by this zero-cost stack."
  }
}

variable "instance_ocpus" {
  description = "OCPUs assigned to the instance."
  type        = number
  default     = 1

  validation {
    condition     = var.instance_ocpus == 1
    error_message = "The approved personal instance uses exactly 1 OCPU."
  }
}

variable "instance_memory_gbs" {
  description = "Memory assigned to the instance in GB."
  type        = number
  default     = 2

  validation {
    condition     = var.instance_memory_gbs == 2
    error_message = "The approved personal instance uses exactly 2 GB of memory."
  }
}

variable "boot_volume_size_gbs" {
  description = "Boot volume size."
  type        = number
  default     = 50

  validation {
    condition     = var.boot_volume_size_gbs == 50
    error_message = "The approved boot volume is fixed at 50 GB."
  }
}

variable "data_volume_size_gbs" {
  description = "Persistent data volume size."
  type        = number
  default     = 50

  validation {
    condition     = var.data_volume_size_gbs == 50
    error_message = "The approved persistent data volume is fixed at 50 GB."
  }
}

variable "image_ocid" {
  description = "Optional pinned Ubuntu ARM64 platform image OCID. Null selects the latest matching platform image at plan time."
  type        = string
  default     = null

  validation {
    condition     = var.image_ocid == null || can(regex("^ocid1\\.image\\.", var.image_ocid))
    error_message = "image_ocid must be null or an OCI image OCID."
  }
}

variable "public_hostname" {
  description = "Final Cloudflare hostname and WebAuthn RP ID."
  type        = string
  default     = "gym.mientrenadorpersonal.com.ar"

  validation {
    condition     = var.public_hostname == "gym.mientrenadorpersonal.com.ar"
    error_message = "The production hostname is already fixed; changing it would invalidate passkeys."
  }
}

variable "freeform_tags" {
  description = "Additional non-confidential free-form tags applied to OCI resources."
  type        = map(string)
  default     = {}
}
