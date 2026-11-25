import AsyncStorage from '@react-native-async-storage/async-storage';
import {Address,Product} from './api';
export type CartItem=Product&{qty:number};
export async function restore(uid:string){try{const [cart,place]=await Promise.all([AsyncStorage.getItem('nn.cart.'+uid),AsyncStorage.getItem('nn.place.'+uid)]);return {cart:cart?JSON.parse(cart) as CartItem[]:[],place:place?JSON.parse(place) as Address:null}}catch{return {cart:[],place:null}}}
export async function persist(uid:string,cart:CartItem[],place:Address|null){await Promise.all([AsyncStorage.setItem('nn.cart.'+uid,JSON.stringify(cart)),AsyncStorage.setItem('nn.place.'+uid,JSON.stringify(place))])}
