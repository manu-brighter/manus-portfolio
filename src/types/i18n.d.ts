import type { AllMessages } from "../i18n/messages";

declare global {
  interface IntlMessages extends AllMessages {}
}
