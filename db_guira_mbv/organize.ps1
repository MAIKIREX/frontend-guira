$ErrorActionPreference = "Stop"

$baseDir = "c:\Users\MIGUEL\Desktop\witronix\Proyectos\m-guira\db_guira_mbv"
Set-Location -Path $baseDir

# Define folders
$folders = @(
    "1_Identidad_y_Perfiles",
    "2_Compliance_y_KYB",
    "3_Orquestacion_Financiera",
    "4_Integracion_Bridge",
    "5_Sistema_y_Operaciones"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
    }
}

# Mapping files to folders
$mappings = @{
    "1_Identidad_y_Perfiles" = @("user_profiles.md", "people.md", "customer_settings.md", "customer_events_log.md")
    "2_Compliance_y_KYB" = @("kyc_applications.md", "kyb_applications.md", "businesses.md", "business_ubos.md", "business_directors.md", "documents.md", "document_versions.md", "reviews.md", "review_comments.md", "review_events.md")
    "3_Orquestacion_Financiera" = @("fiat_deposit_intents.md", "manual_deposit_requests.md", "withdrawal_requests.md", "supplier_payment_requests.md", "supplier_payment_documents.md", "supplier_payment_document_versions.md", "wallets.md", "balances.md", "transactions.md", "transaction_documents.md", "receipts.md", "certificates.md", "asset_prices.md")
    "4_Integracion_Bridge" = @("provider_candidates.md", "provider_mappings.md", "bridge_countries.md", "bridge_subdivisions.md", "bridge_virtual_accounts.md", "bridge_liquidation_addresses.md", "bridge_liquidation_address_drains.md", "bridge_transfer_snapshots.md", "bridge_pull_jobs.md", "external_accounts.md")
    "5_Sistema_y_Operaciones" = @("webhook_events.md", "notifications.md", "audit_logs.md", "event_logs.md", "support_tickets.md", "platform_settings.md")
}

foreach ($entry in $mappings.GetEnumerator()) {
    $targetFolder = $entry.Key
    foreach ($file in $entry.Value) {
        if (Test-Path $file) {
            Move-Item -Path $file -Destination $targetFolder -Force
        }
    }
}

Write-Host "Files successfully organized!"
