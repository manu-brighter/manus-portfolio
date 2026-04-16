import type messages from "../../messages/de.json";

type Messages = typeof messages;

declare global {
  interface IntlMessages extends Messages {}
}
