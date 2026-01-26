import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type ShopDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ShopDetail'>;
type ShopDetailScreenRouteProp = RouteProp<RootStackParamList, 'ShopDetail'>;

interface Props {
  navigation: ShopDetailScreenNavigationProp;
  route: ShopDetailScreenRouteProp;
}

export default function ShopDetailScreen({ navigation, route }: Props) {
  const { shopId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shop Detail Screen</Text>
      <Text>Shop ID: {shopId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});