import { Tabs } from "expo-router";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from 'react';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import 'expo-dev-client';
import auth from '@react-native-firebase/auth';
import GameScreen from './GameScreen';
import ChatScreen from './ChatScreen';
import Profile from './Profile';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import {NavigationContainer} from '@react-navigation/native';
import { Image, UIManager } from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Starter from './Starter';
import 'expo-dev-client';

UIManager.setLayoutAnimationEnabledExperimental &&
UIManager.setLayoutAnimationEnabledExperimental(true);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

SplashScreen.preventAutoHideAsync();

export default function Page() {

  useEffect(() => {
    async function prepare() {
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState();
  const [isLoading, setIsLoading ] = useState(true);

  // Handle user state changes
  function onAuthStateChanged(user) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber;
  }, []);

  if (initializing) return null

  return (
    <SafeAreaProvider>
        {!user ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="Starter"
              component={Starter}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        ) : (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: 'blue',
              tabBarInactiveTintColor: 'gray',
              tabBarIcon: ({ color, size }) => {
                let iconSource;
                if (route.name === 'Game') {
                  iconSource = require('../../public/duo.png');
                } else if (route.name === 'Chat') {
                  iconSource = require('../../public/chaticon.png');
                } else if (route.name === 'Profile') {
                  iconSource = require('../../public/1.png');
                }
                return <Image source={iconSource} style={{ width: size, height: size, tintColor: color }} />;
              },
            })}
          >
            <Tab.Screen name="Game" >
              {props => <GameScreen {...props} user={user} />}
            </Tab.Screen>
            <Tab.Screen name="Profile">
              {props => <Profile {...props} user={user} />}
            </Tab.Screen>
            <Tab.Screen name="Chat" options={{ tabBarStyle: { display: 'none' }, }} >
              {props => <ChatScreen {...props} onBack={() => props.navigation.goBack()} user={user}  />}
            </Tab.Screen>
          </Tab.Navigator>
        )}
    </SafeAreaProvider>
  );
}