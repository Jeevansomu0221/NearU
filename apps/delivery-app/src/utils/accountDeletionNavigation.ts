import { StackActions } from "@react-navigation/native";

const getRootNavigation = (navigation: any) => {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
};

export const openAccountDeletionReview = (navigation: any) => {
  const rootNavigation = getRootNavigation(navigation);

  if (typeof rootNavigation.navigate === "function") {
    rootNavigation.navigate("AccountDeletionReview");
    return;
  }

  rootNavigation.dispatch(StackActions.push("AccountDeletionReview"));
};
