import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { PlayerProvider } from '../context/PlayerContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { colors } from '../theme/colors';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.dark900,
    card: colors.dark800,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
};

export default function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.dark900, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <PlayerProvider>
      <NavigationContainer theme={theme}>
        {token ? <MainStack /> : <AuthStack />}
      </NavigationContainer>
    </PlayerProvider>
  );
}
