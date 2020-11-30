import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

export type ParamList = {
  Dashboard: undefined;
  Report: undefined;
};

export type ParamListProps<T extends keyof ParamList> = {
  navigation: StackNavigationProp<ParamList, T>;
  route: RouteProp<ParamList, T>;
};
