import { StackActions } from "@react-navigation/native";
import type { AccountDeletionRequest } from "../api/accountDeletion.api";

const getRootNavigation = (navigation: any) => {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
};

export const openAccountDeletionReview = (
  navigation: any,
  initialRequest?: AccountDeletionRequest | null
) => {
  const rootNavigation = getRootNavigation(navigation);

  if (typeof rootNavigation.navigate === "function") {
    rootNavigation.navigate("AccountDeletionReview", {
      initialRequest: initialRequest || undefined
    });
    return;
  }

  rootNavigation.dispatch(StackActions.push("AccountDeletionReview"));
};
