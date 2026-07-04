import { CommonActions } from "@react-navigation/native";

const getRootNavigation = (navigation: any) => {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
};

export const openAccountDeletionReview = (navigation: any) => {
  const rootNavigation = getRootNavigation(navigation);
  rootNavigation.dispatch(
    CommonActions.navigate({
      name: "AccountDeletionReview"
    })
  );
};
