import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BrandButton } from "#/components/features/settings/brand-button";
import { SettingsInput } from "#/components/features/settings/settings-input";
import {
  addVeniceAccount,
  getAvailableVeniceAccountCount,
  getVeniceAccounts,
  initVeniceAccountRotation,
  isVeniceAutoRotationEnabled,
  removeVeniceAccount,
  resetVeniceAccountLimits,
  setVeniceAccountEnabled,
  setVeniceAutoRotationEnabled,
  type VeniceAccount,
} from "#/utils/llm-rate-limit-handler";
import { cn } from "#/utils/utils";
import { I18nKey } from "#/i18n/declaration";
import { extensionModuleEmptyStateClassName } from "#/utils/extension-module-card-classes";

initVeniceAccountRotation();

interface VeniceAccountManagerProps {
  className?: string;
}

export function VeniceAccountManager({ className }: VeniceAccountManagerProps) {
  const { t } = useTranslation("openhands");
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [, refresh] = useState(0);

  const accounts = getVeniceAccounts();
  const autoRotation = isVeniceAutoRotationEnabled();
  const availableCount = getAvailableVeniceAccountCount();

  const handleAddAccount = () => {
    const label = newLabel.trim();
    const apiKey = newApiKey.trim();
    if (!label || !apiKey) return;
    addVeniceAccount({ label, apiKey, enabled: true });
    setNewLabel("");
    setNewApiKey("");
    setIsAdding(false);
    refresh((value) => value + 1);
  };

  // Pre-configured test accounts for immediate 24-7 mode usage
  const testAccountLabels = [
    "venice-free-1",
    "venice-free-2",
    "venice-free-3",
    "venice-free-4",
  ];

  const handleQuickSetup = () => {
    const existingAccounts = getVeniceAccounts();
    if (existingAccounts.length > 0) {
      if (
        !window.confirm(
          "Existing Venice.ai accounts will be replaced. Continue?",
        )
      ) {
        return;
      }
      existingAccounts.forEach((account) => removeVeniceAccount(account.label));
    }

    testAccountLabels.forEach((label, index) => {
      const apiKey = `test-key-${label}-${index + 1}`;
      addVeniceAccount({ label, apiKey, enabled: true });
    });
    refresh((value) => value + 1);
  };

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium text-contrast">
            {t(I18nKey.SETTINGS$PROVIDER_CONNECTIONS_TITLE)}
          </h2>
          <p className="text-sm text-muted">
            {t(I18nKey.SETTINGS$AVAILABLE_PROFILES, { count: availableCount })}{" "}
            ·{" "}
            {autoRotation
              ? t(I18nKey.SETTINGS$SKILLS_ENABLED)
              : t(I18nKey.SETTINGS$SKILLS_DISABLED)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BrandButton
            testId="venice-add-account"
            type="button"
            variant="secondary"
            onClick={() => setIsAdding((value) => !value)}
          >
            {t(I18nKey.BUTTON$ADD)}
          </BrandButton>
          <BrandButton
            testId="venice-quick-setup"
            type="button"
            variant="tertiary"
            onClick={handleQuickSetup}
          >
            {t(I18nKey.SETTINGS$PROVIDER_CONNECTION_BULK_ADD)}
          </BrandButton>
        </div>
      </div>

      <div className={extensionModuleEmptyStateClassName}>
        <label className="flex items-center gap-2 text-sm text-contrast">
          <input
            data-testid="venice-auto-rotation"
            type="checkbox"
            checked={autoRotation}
            onChange={(event) => {
              setVeniceAutoRotationEnabled(event.target.checked);
              refresh((value) => value + 1);
            }}
          />
          {t(I18nKey.SCHEMA$LLM$VENICE_RATE_LIMIT_MODE$LABEL)}
        </label>
      </div>

      {isAdding && (
        <div className="flex flex-col gap-3 rounded border border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SettingsInput
              testId="venice-account-label"
              label={t(I18nKey.SETTINGS$NAME)}
              type="text"
              value={newLabel}
              onChange={setNewLabel}
              required
            />
            <SettingsInput
              testId="venice-account-api-key"
              label={t(I18nKey.SETTINGS_FORM$API_KEY)}
              type="password"
              value={newApiKey}
              onChange={setNewApiKey}
              required
            />
          </div>
          <BrandButton
            testId="venice-save-account"
            type="button"
            variant="primary"
            isDisabled={!newLabel.trim() || !newApiKey.trim()}
            onClick={handleAddAccount}
          >
            {t(I18nKey.BUTTON$SAVE)}
          </BrandButton>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className={extensionModuleEmptyStateClassName}>
          <p className="text-sm text-muted">
            {t(I18nKey.SETTINGS$PROVIDER_CONNECTIONS_EMPTY)}
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded border border-border">
          {accounts.map((account: VeniceAccount) => (
            <div
              key={account.label}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-contrast">
                  {account.label}
                </p>
                <p className="text-xs text-muted">
                  {account.enabled
                    ? t(I18nKey.SETTINGS$SKILLS_ENABLED)
                    : t(I18nKey.SETTINGS$SKILLS_DISABLED)}
                  {account.limitedAt
                    ? ` · ${t(I18nKey.STATUS$ERROR_LLM_SERVICE_UNAVAILABLE)}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <BrandButton
                  testId={`venice-toggle-${account.label}`}
                  type="button"
                  variant="tertiary"
                  onClick={() => {
                    setVeniceAccountEnabled(account.label, !account.enabled);
                    refresh((value) => value + 1);
                  }}
                >
                  {account.enabled
                    ? t(I18nKey.SETTINGS$SKILLS_DISABLED)
                    : t(I18nKey.SETTINGS$SKILLS_ENABLED)}
                </BrandButton>
                <BrandButton
                  testId={`venice-reset-${account.label}`}
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetVeniceAccountLimits();
                    refresh((value) => value + 1);
                  }}
                >
                  {t(I18nKey.SETTINGS$RESET)}
                </BrandButton>
                <BrandButton
                  testId={`venice-remove-${account.label}`}
                  type="button"
                  variant="ghost-danger"
                  onClick={() => {
                    removeVeniceAccount(account.label);
                    refresh((value) => value + 1);
                  }}
                >
                  {t(I18nKey.COMMON$REMOVE)}
                </BrandButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
