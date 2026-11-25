import {initializeApp} from 'firebase/app';
import {initializeAuth,GoogleAuthProvider,signInWithCredential,onAuthStateChanged,signOut,User} from '@firebase/auth';
// Metro resolves the React Native entry; TypeScript reads the package's generic declarations.
// @ts-expect-error getReactNativePersistence is exported by the React Native entry.
import {getReactNativePersistence} from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
const app=initializeApp({apiKey:'AIzaSyCiNmnwWLiOPRnuIp7zwReZ-VZrFEHD6U8',authDomain:'nearbynowstore.firebaseapp.com',projectId:'nearbynowstore',appId:'1:742696467039:web:580c00d9e3d9449ca6f9ea'});
export const auth=initializeAuth(app,{persistence:getReactNativePersistence(AsyncStorage)});
GoogleSignin.configure({webClientId:process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID||'742696467039-2nd03dqvd6c7mchqutkb1j59egtg33pe.apps.googleusercontent.com'});
export function observeUser(set:(user:User|null)=>void){return onAuthStateChanged(auth,set)}
export async function login(){await GoogleSignin.hasPlayServices();const result=await GoogleSignin.signIn();const idToken=result.data?.idToken;if(!idToken)throw Error('Google did not return an ID token.');return signInWithCredential(auth,GoogleAuthProvider.credential(idToken))}
export async function logout(){await signOut(auth);try{await GoogleSignin.signOut()}catch{}}
