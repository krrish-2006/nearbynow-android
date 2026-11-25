import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,BackHandler,Dimensions,Image,Keyboard,Linking,Modal,Platform,Pressable,SafeAreaView,ScrollView,StatusBar,StyleSheet,Text,TextInput,View} from 'react-native';
import {MapPin,Search,ShoppingBasket,ChevronDown,ChevronLeft,Plus,Minus,X,Camera,Store,House,PackageOpen,ClipboardList,LogOut,Check,ArrowRight,ShieldCheck,UserRound,Carrot,Milk,Cookie,CupSoda,Wheat,SprayCan,Headphones,Shirt,Grid2X2,Snowflake} from 'lucide-react-native';
import * as Location from 'expo-location';
import {User} from 'firebase/auth';
import {login,logout,observeUser} from './src/auth';
import {api,Address,Order,Product,money,photo} from './src/api';
import {CartItem,persist,restore} from './src/storage';
const green='#19523d',dark='#183d30',muted='#67786c',line='#e4e9e3',bg='#f5f8f3';
const categories = [
  ['All', ShoppingBasket],
  ['Winter', Snowflake],
  ['Electronics', Headphones],
  ['Produce', Carrot],
  ['Dairy & eggs', Milk],
  ['Snacks', Cookie],
  ['Beverages', CupSoda],
  ['Pantry', Wheat],
  ['Personal care', SprayCan],
  ['Household', House],
  ['Fashion', Shirt],
  ['Other', Grid2X2],
] as const;
const mainTabs = [
  { page: 'home', title: 'Shop', Icon: Store },
  { page: 'orders', title: 'Orders', Icon: ClipboardList },
  { page: 'cart', title: 'Cart', Icon: ShoppingBasket },
] as const;
type ProductDetails = Product & { shelf_life?: string | null };
type Page='home'|'search'|'product'|'cart'|'account'|'orders'|'addresses'|'privacy';
function Txt({children,style,lines}:any){return <Text numberOfLines={lines} style={[s.text,style]}>{children}</Text>}
function Button({children,onPress,style,disabled=false}:any){return <Pressable disabled={disabled} onPress={onPress} style={[s.button,style,disabled&&{opacity:.45}]}><Txt style={{color:'white',fontWeight:'700',textAlign:'center'}}>{children}</Txt></Pressable>}
function IconButton({children,onPress}:any){return <Pressable onPress={onPress} hitSlop={12} style={{padding:7}}>{children}</Pressable>}
function Empty({icon,title,detail,action,onPress}:any){return <View style={s.empty}>{icon}<Txt style={s.h2}>{title}</Txt><Txt style={{color:muted,textAlign:'center'}}>{detail}</Txt>{action&&<Button onPress={onPress} style={{marginTop:18}}>{action}</Button>}</View>}
export default function App(){
 const [user,setUser]=useState<User|null|undefined>(undefined),[loginError,setLoginError]=useState(''),[busyLogin,setBusyLogin]=useState(false);
 useEffect(()=>observeUser(setUser),[]);
 if(user===undefined)return <SafeAreaView style={s.center}><ActivityIndicator color={green}/><Txt>Checking your account…</Txt></SafeAreaView>;
 if(!user)return <SafeAreaView style={s.auth}><View style={s.logo}><ShoppingBasket color={green} size={28}/><Txt style={s.brand}>Nearby<Txt style={{color:'#719d5a'}}>Now</Txt></Txt></View><View style={s.authBox}><Txt style={s.title}>Login or Sign up</Txt><Txt style={{textAlign:'center',marginVertical:20}}>Shop from stores near you</Txt><Pressable style={s.google} disabled={busyLogin} onPress={async()=>{setBusyLogin(true);setLoginError('');try{await login()}catch(e:any){setLoginError(e.message)}finally{setBusyLogin(false)}}}><Txt style={{fontSize:22,fontWeight:'900',color:'#4285f4'}}>G</Txt><Txt style={{fontWeight:'700'}}>{busyLogin?'Opening Google…':'Continue with Google'}</Txt></Pressable>{!!loginError&&<Txt style={{color:'#a62727',marginTop:16}}>{loginError}</Txt>}</View></SafeAreaView>;
 return <Shop key={user.uid} user={user}/>;
}
function Shop({user}:{user:User}){
 const [page,setPage]=useState<Page>('home'),[previous,setPrevious]=useState<Page>('home'),[locationOpen,setLocationOpen]=useState(false),[place,setPlace]=useState<Address|null>(null),[cart,setCart]=useState<CartItem[]>([]),[loaded,setLoaded]=useState(false);
 const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[products,setProducts]=useState<Product[]>([]),[more,setMore]=useState(false),[offset,setOffset]=useState(0),[loading,setLoading]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState<ProductDetails|null>(null),[related,setRelated]=useState<Product[]>([]),[available,setAvailable]=useState<boolean|null>(null),[orders,setOrders]=useState<Order[]>([]),[addresses,setAddresses]=useState<Address[]>([]),[refresh,setRefresh]=useState(0),[checkoutBusy,setCheckoutBusy]=useState(false),[requestKey,setRequestKey]=useState<string|null>(null);
 const [locationQuery,setLocationQuery]=useState(''),[suggestions,setSuggestions]=useState<{name:string;address:string;pin:string|null}[]>([]),[shops,setShops]=useState<{name:string;address:string;pin:string}[]>([]),[editing,setEditing]=useState<Address|null>(null),[locationBusy,setLocationBusy]=useState(false);
 const [detailsOpen, setDetailsOpen] = useState(false);
 useEffect(()=>{restore(user.uid).then(v=>{setCart(v.cart);setPlace(v.place);setLoaded(true)})},[user.uid]);
 useEffect(()=>{if(loaded)persist(user.uid,cart,place).catch(()=>{})},[cart,place,loaded,user.uid]);
 const navigate = (destination: Page) => {
   if (destination === page) return;
   Keyboard.dismiss();
   setPrevious(page);
   setPage(destination);
 };
 const selectCategory = (next: string) => {
   if (next === category) return;
   setProducts([]);
   setMore(false);
   setLoading(Boolean(place?.pin));
   setOffset(0);
   setCategory(next);
 };
 const back=()=>{if(locationOpen){setLocationOpen(false);return true}if(page==='product'){setPage(previous==='search'?'search':'home');return true}if(page==='home')return false;setPage(page==='cart'?previous:'home');return true};
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',back);return()=>sub.remove()});
 const pin = place?.pin;
 const searching = page === 'search';
 const winterCollection = !searching && category === 'Winter';
 const catalogQuery = searching ? query : winterCollection ? 'winter' : '';
 const catalogCategory = searching || winterCollection ? '' : category;
 useEffect(() => {
   if (!pin) return;
   let active = true;
   const timeout = setTimeout(async () => {
     if (!active) return;
     setLoading(true);
     setError('');
     try {
       const params = new URLSearchParams({ pin, q: catalogQuery, category: catalogCategory, offset: String(offset) });
       const result = await api<{ products: Product[]; more: boolean }>('catalog?' + params);
       if (active) {
         setProducts(previous => offset ? [...previous, ...result.products] : result.products);
         setMore(result.more);
       }
     } catch (error) {
       if (active) setError(error instanceof Error ? error.message : String(error));
     } finally {
       if (active) setLoading(false);
     }
   }, 250);
   return () => { active = false; clearTimeout(timeout); };
 }, [pin, catalogQuery, catalogCategory, offset, refresh]);
 useEffect(()=>{if(!selected||!place?.pin)return;let active=true;api<{product:ProductDetails;related:Product[]}>('product?'+new URLSearchParams({id:selected.id,pin:place.pin})).then(r=>{if(active){setSelected(r.product);setRelated(r.related)}}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[selected?.id,place?.pin,refresh]);
 useEffect(()=>{if(page!=='cart'||!cart.length)return;let active=true;const check=()=>api<{available:boolean}>('availability?shop='+encodeURIComponent(cart[0].shop_id)).then(r=>{if(active)setAvailable(r.available)}).catch(()=>{if(active)setAvailable(false)});check();const id=setInterval(check,4000);return()=>{active=false;clearInterval(id)}},[page,cart[0]?.shop_id]);
 useEffect(()=>{if(page!=='orders')return;let active=true;const load=()=>api<Order[]>('orders?role=customer').then(r=>{if(active){setOrders(r);setError('')}}).catch(e=>{if(active)setError(e.message)});load();const id=setInterval(load,4000);return()=>{active=false;clearInterval(id)}},[page,refresh]);
 useEffect(()=>{if(page!=='addresses'&&!locationOpen)return;api<{addresses:Address[]}>('account').then(r=>setAddresses(r.addresses)).catch(e=>setError(e.message))},[page,locationOpen,refresh]);
 useEffect(()=>{if(locationQuery.trim().length<3){setSuggestions([]);setShops([]);return}let active=true;const t=setTimeout(async()=>{const q=encodeURIComponent(locationQuery.trim());const [a,b]=await Promise.allSettled([api<{matches:typeof suggestions}>('address-search?q='+q),api<typeof shops>('areas?q='+q)]);if(active){setSuggestions(a.status==='fulfilled'?a.value.matches:[]);setShops(b.status==='fulfilled'?b.value:[])}},450);return()=>{active=false;clearTimeout(t)}},[locationQuery]);
 const closeLocation = () => { setLocationOpen(false); setEditing(null); };
 const addDeliveryAddress = () => {
   setEditing({ label: 'Home', address: '', pin: place?.pin || '' });
   setLocationOpen(true);
 };
 const changePlace = (next: Address) => {
   if (next.pin !== place?.pin) setCart([]);
   if (next.pin !== place?.pin || next.address !== place.address) setRequestKey(null);
   setPlace(next);
   closeLocation();
   setOffset(0);
   setRefresh(value => value + 1);
 };
 const adjust=(p:Product,n:number)=>{if(n>0&&cart.length&&cart[0].shop_id!==p.shop_id){Alert.alert('One shop at a time','Check out or empty your current cart first.');return}setRequestKey(null);setCart(old=>{const count=(old.find(i=>i.id===p.id)?.qty||0)+n;if(count>p.stock)return old;return [...old.filter(i=>i.id!==p.id),...(count>0?[{...p,qty:count}]:[])]})};
 const qty=(p:Product)=>{const n=cart.find(i=>i.id===p.id)?.qty||0;return n?<View style={s.stepper}><IconButton onPress={()=>adjust(p,-1)}><Minus size={17} color="white"/></IconButton><Txt style={{color:'white',fontWeight:'800',minWidth:25,textAlign:'center'}}>{n}</Txt><IconButton onPress={()=>adjust(p,1)}><Plus size={17} color={n>=p.stock?'#9bc2a7':'white'}/></IconButton></View>:<Pressable style={s.add} disabled={!p.stock} onPress={()=>adjust(p,1)}><Txt style={{color:green,fontWeight:'800'}}>{p.stock?'ADD':'SOLD OUT'}</Txt></Pressable>};
 const item=(p:Product)=><Pressable key={p.id} style={s.product} onPress={()=>{setSelected(p);navigate('product')}}><View style={s.productImage}>{photo(p.photo)?<Image source={{uri:photo(p.photo)!}} style={s.productPhoto} resizeMode="contain"/>:<View style={s.noPhoto}><Camera size={26} color={muted}/><Txt style={s.small}>No photo yet</Txt></View>}</View><View style={{padding:10,flex:1}}><Txt style={s.small} lines={1}>{p.shop} · {p.unit}</Txt><Txt style={{fontWeight:'700',marginVertical:5}} lines={2}>{p.name}</Txt><View style={s.productActions}><Txt style={{fontWeight:'800'}}>{money(p.price)}</Txt><View style={{alignSelf:'flex-end'}}>{qty(p)}</View></View></View></Pressable>;
 const total=cart.reduce((n,i)=>n+i.price*i.qty,0),units=cart.reduce((n,i)=>n+i.qty,0);
 const deliveryAddress = place?.address.trim() || '';
 const placeOrder = async () => {
   if (!place?.pin || !deliveryAddress) {
     addDeliveryAddress();
     return;
   }
   if (checkoutBusy || available !== true) return;
   setCheckoutBusy(true);
   try {
     const key = requestKey || String(Date.now()) + '-' + Math.random().toString(36).slice(2);
     setRequestKey(key);
     await api('orders', { key, pin: place.pin, address: deliveryAddress, items: cart.map(item => ({ id: item.id, qty: item.qty, price: item.price })) });
     setCart([]);
     setRequestKey(null);
     setRefresh(value => value + 1);
     navigate('orders');
   } catch (error) {
     Alert.alert('Order could not be placed', error instanceof Error ? error.message : String(error));
   } finally {
     setCheckoutBusy(false);
   }
 };
 const detect=async()=>{setLocationBusy(true);try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw Error('Allow location permission in Android settings, or search for an address.');const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});const coords={lat:pos.coords.latitude,lng:pos.coords.longitude};const r=await api<{suggestion:{pin:string;shop:string}|null}>('locate?'+new URLSearchParams({lat:String(coords.lat),lng:String(coords.lng)}));if(r.suggestion)changePlace({label:'Current location',address:'',pin:r.suggestion.pin,coordinates:coords});else Alert.alert('Outside delivery area','No participating shop is within 3 km. Search for another delivery address.')}catch(e:any){Alert.alert('Location unavailable',e.message)}finally{setLocationBusy(false)}};
 const saveAddress=async()=>{if(!editing?.label?.trim()||!editing.address?.trim()||!/^\d{6}$/.test(editing.pin)){Alert.alert('Check address','Enter a label, full address, and six-digit PIN code.');return}try{const r=await api<{id:string}>('addresses',editing);const saved={...editing,id:r.id};setRefresh(v=>v+1);changePlace(saved)}catch(e:any){Alert.alert('Could not save address',e.message)}};
 const shelfLife = typeof selected?.shelf_life === 'string' ? selected.shelf_life.trim() : '';
 const pageTitles = {
   search: 'Search', product: 'Product details', cart: 'My Cart', account: 'My Account',
   orders: 'My Orders', addresses: 'My Addresses', privacy: 'Account privacy',
 };
 const address = [place?.label, place?.address || place?.pin]
   .filter(Boolean).join(' · ') || 'Choose a delivery address';

 return <SafeAreaView style={s.root}>
  <StatusBar barStyle="dark-content" />
  {page === 'home' ? (
    <View style={s.storefrontHeader}>
      <View style={s.storefrontTopRow}>
        <View style={s.logo}>
          <ShoppingBasket color={green} size={24} />
          <Txt style={s.brand}>Nearby<Text style={s.brandAccent}>Now</Text></Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My account"
          onPress={() => navigate('account')}
          style={({ pressed }) => [s.profileButton, pressed && s.pressed]}
        >
          <UserRound color={green} size={22} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Change delivery address. ${address}`}
        onPress={() => setLocationOpen(true)}
        style={({ pressed }) => [s.locationButton, pressed && s.pressed]}
      >
        <MapPin size={20} color={green} />
        <View style={s.locationText}>
          <Txt style={s.locationCaption}>Delivering to</Txt>
          <Txt style={s.locationAddress} lines={1}>{address}</Txt>
        </View>
        <ChevronDown size={18} color={green} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search for products or shops"
        onPress={() => { setQuery(''); setOffset(0); navigate('search'); }}
        style={({ pressed }) => [s.homeSearch, pressed && s.pressed]}
      >
        <Search size={21} color="#d8e8d8" />
        <Txt style={s.homeSearchText} lines={1}>Search products or shops</Txt>
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.categoryStrip}
        contentContainerStyle={s.categories}
      >
        {categories.map(([name, Icon]) => {
          const value = name === 'All' ? '' : name;
          const selected = category === value;
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => selectCategory(value)}
              style={[s.category, selected && s.categorySelected]}
            >
              <View style={[s.categoryIcon, selected && s.categoryIconSelected]}>
                <Icon size={21} color={selected ? green : muted} strokeWidth={1.8} />
              </View>
              <Txt style={[s.categoryLabel, selected && s.categoryLabelSelected]} lines={1}>{name}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ) : (
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back} hitSlop={10}>
        <ChevronLeft size={27} color={dark} />
      </Pressable>
      <Txt style={s.pageTitle} lines={1}>{pageTitles[page]}</Txt>
      {page !== 'cart' && page !== 'orders' && <IconButton onPress={() => navigate('cart')}>
        <ShoppingBasket size={24} color={green} />
        {units > 0 && <View style={s.badge}><Txt style={s.badgeText}>{units}</Txt></View>}
      </IconButton>}
    </View>
  )}
  {page === 'home' && (
    <ScrollView style={s.screenScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.homeContent}>
      {!category && (
        <View style={s.hero}>
          <Txt style={s.heroTitle}>Your local shops,{'\n'}one doorstep.</Txt>
          <View style={s.heroIcon}><Store color="#e4f2d8" size={35} strokeWidth={1.6} /></View>
        </View>
      )}
      <Txt style={s.h2}>{category || 'Around you'}</Txt>
      {!place?.pin
        ? <Empty icon={<MapPin size={35} color={green} />} title="What’s available near you?" detail="Choose a delivery address to browse nearby shops." action="Set location" onPress={() => setLocationOpen(true)} />
        : error
          ? <Empty icon={<PackageOpen color={green} />} title="Couldn’t load products" detail={error} action="Retry" onPress={() => setRefresh(v => v + 1)} />
          : !loading && products.length === 0 && category
            ? <Empty icon={<PackageOpen size={30} color={green} />} title="Nothing in stock here yet" detail={`There are no ${category.toLowerCase()} items available near your address right now.`} action="See all products" onPress={() => selectCategory('')} />
            : <View style={s.grid}>{products.map(item)}{loading && <ActivityIndicator color={green} />}</View>}
      {more && <Button onPress={() => setOffset(v => v + 48)}>Load more</Button>}
    </ScrollView>
  )}
 {page==='search'&&<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}><View style={s.searchBar}><Search color={dark} size={20}/><TextInput autoFocus placeholder="Search for products" value={query} onChangeText={v=>{setQuery(v);setOffset(0)}} style={s.searchInput}/>{!!query&&<IconButton onPress={()=>setQuery('')}><X size={20} color={dark}/></IconButton>}</View>{!query.trim()?null:loading&&products.length===0?<ActivityIndicator color={green}/>:error?<Empty icon={<Search color={green}/>} title="Couldn’t load products" detail={error} action="Retry" onPress={()=>setRefresh(v=>v+1)}/>:products.length?<><View style={{marginVertical:12}}>{products.slice(0,5).map(p=><Pressable key={p.id} style={s.suggestion} onPress={()=>{setSelected(p);navigate('product')}}>{photo(p.photo)?<Image source={{uri:photo(p.photo)!}} style={{width:34,height:34}} resizeMode="contain"/>:<Camera size={20} color={muted}/>}<Txt style={{marginLeft:14}}>{p.name}</Txt></Pressable>)}</View><Txt style={s.h2}>Showing results for “{query}”</Txt><View style={s.grid}>{products.map(item)}</View>{more&&<Button onPress={()=>setOffset(v=>v+48)}>Load more</Button>}</>:<Empty icon={<Search color="#a2aca5" size={42}/>} title="Nothing here yet" detail={'No products match “'+query+'” in your delivery area.'}/>}</ScrollView>}
  {page === 'product' && selected && (
    <>
      <ScrollView contentContainerStyle={s.productPage}>
        <View style={s.detailImage}>
          {photo(selected.photo) ? <Image source={{ uri: photo(selected.photo)! }} style={s.productPhoto} resizeMode="contain" /> : (
            <View style={s.noPhoto}><Camera size={40} color={muted} /><Txt>No photo yet</Txt></View>
          )}
        </View>
        <View style={s.productBody}>
          <View style={s.productHighlights}>
            <View style={s.highlightTile}>
              <Txt style={s.locationCaption}>Shelf life</Txt>
              <Txt style={s.highlightValue}>{shelfLife || 'Not listed'}</Txt>
            </View>
            <View style={s.highlightTile}>
              <Txt style={s.locationCaption}>Pack size</Txt>
              <Txt style={s.highlightValue}>{selected.unit || 'Not listed'}</Txt>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="View product details" onPress={() => setDetailsOpen(true)} style={({pressed}) => [s.detailsButton, pressed && s.pressed]}>
              <Txt style={s.detailsButtonText}>View details</Txt>
            </Pressable>
          </View>
          <Txt style={s.title}>{selected.name}</Txt>
          <Txt style={{ color: muted }}>Sold by {selected.shop}</Txt>
          <View style={s.purchase}>
            <View>
              <Txt style={{ fontSize: 21, fontWeight: '800' }}>{money(selected.price)}</Txt>
              <Txt style={s.small}>{selected.stock} available</Txt>
            </View>
            {qty(selected)}
          </View>
          {related.length > 0 && (
            <>
              <Txt style={s.h2}>Similar products</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.relatedProducts}>
                {related.map(item)}
              </ScrollView>
            </>
          )}
        </View>
      </ScrollView>
      <Modal visible={detailsOpen} transparent animationType="slide" onRequestClose={() => setDetailsOpen(false)}>
        <View style={s.detailsOverlay}>
          <Pressable accessibilityElementsHidden importantForAccessibility="no" style={StyleSheet.absoluteFill} onPress={() => setDetailsOpen(false)} />
          <SafeAreaView style={s.detailsSheet} accessibilityViewIsModal>
            <View style={s.detailsSheetHeader}>
              {photo(selected.photo) && <Image source={{ uri: photo(selected.photo)! }} style={s.detailsThumb} resizeMode="contain" />}
              <View style={s.locationText}>
                <Txt style={s.locationCaption}>Product details</Txt>
                <Txt style={s.detailsSheetTitle}>{selected.name}</Txt>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close product details" onPress={() => setDetailsOpen(false)} style={s.profileButton}>
                <X size={21} color={green} />
              </Pressable>
            </View>
            <ScrollView bounces={false} contentContainerStyle={s.detailsSheetContent}>
              {[
                ['Shelf life', shelfLife || 'Not listed'],
                ['Pack size', selected.unit],
                ['Category', selected.category],
                ['Sold by', selected.shop],
              ].map(([label, value]) => (
                <View key={label} style={s.detailRow}>
                  <Txt style={s.detailRowLabel}>{label}</Txt>
                  <Txt style={s.detailRowValue}>{value || 'Not listed'}</Txt>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  )}
 {page==='cart'&&<><ScrollView style={s.screenScroll} contentContainerStyle={s.content}>{!cart.length?<Empty icon={<ShoppingBasket size={40} color={green}/>} title="Your cart is empty" detail="Add something from a nearby shop." action="Browse products" onPress={()=>navigate('home')}/>:<><View style={s.card}><Txt style={{fontWeight:'800'}}>◷  Delivery from {cart[0].shop}</Txt><Txt style={s.small}>{units} items · {available===null?'Checking rider availability…':available?'Rider available nearby':'No rider available right now'}</Txt>{cart.map(p=><View key={p.id} style={s.cartRow}>{photo(p.photo)?<Image source={{uri:photo(p.photo)!}} style={s.cartPhoto} resizeMode="contain"/>:<Camera color={muted}/>}<View style={{flex:1}}><Txt style={{fontWeight:'700'}} lines={2}>{p.name}</Txt><Txt style={s.small}>{p.unit}</Txt><Txt style={{fontWeight:'800'}}>{money(p.price)}</Txt></View>{qty(p)}</View>)}</View><View style={s.card}><Txt style={s.h2}>Bill details</Txt><View style={s.bill}><Txt>Items total</Txt><Txt>{money(total)}</Txt></View><View style={s.bill}><Txt>Delivery charge</Txt><Txt>{money(0)}</Txt></View><View style={s.bill}><Txt style={{fontWeight:'800'}}>Grand total</Txt><Txt style={{fontWeight:'800'}}>{money(total)}</Txt></View></View><View style={s.card}><Txt style={{fontWeight:'800'}}>Cancellation policy</Txt><Txt style={s.small}>Orders can be cancelled before the shop accepts them.</Txt></View></>}</ScrollView>{cart.length>0&&<View style={s.cartBottom}><Pressable style={s.bill} onPress={()=>setLocationOpen(true)}><MapPin size={21} color={green}/><View style={{flex:1,marginHorizontal:8}}><Txt style={{fontWeight:'700'}}>Delivering to {place?.label||'your address'}</Txt><Txt style={s.small} lines={1}>{deliveryAddress || 'Choose a full delivery address'}</Txt></View><Txt style={{color:green,fontWeight:'700'}}>Change</Txt></Pressable><Button disabled={checkoutBusy||Boolean(deliveryAddress&&available!==true)} onPress={placeOrder} style={{marginTop:8}}>{checkoutBusy?'Placing order…':!deliveryAddress?'Add delivery address':available?'Place order · '+money(total):'Waiting for a nearby rider'}</Button></View>}</>}
 {page==='account'&&<ScrollView contentContainerStyle={s.content}><View style={s.card}><Txt style={s.h2}>My account</Txt><Txt style={s.small}>{user.email}</Txt></View>{[['My Addresses','addresses',MapPin],['My Orders','orders',ClipboardList],['Account privacy','privacy',ShieldCheck]].map(([label,p,Icon]:any)=><Pressable key={p} style={s.menuRow} onPress={()=>navigate(p)}><Icon size={21} color={green}/><Txt style={{flex:1,marginLeft:13}}>{label}</Txt><ArrowRight size={18} color={muted}/></Pressable>)}<Pressable style={s.menuRow} onPress={async()=>{await logout();setPage('home')}}><LogOut color={green}/><Txt style={{marginLeft:13}}>Logout</Txt></Pressable></ScrollView>}
 {page==='orders'&&<ScrollView style={s.screenScroll} contentContainerStyle={s.content}>{!!error&&<Txt style={{color:'#a62727'}}>{error}</Txt>}{orders.length?orders.map(o=><View key={o.id} style={s.card}><View style={s.bill}><Check color={green}/><View style={{flex:1,marginHorizontal:10}}><Txt style={{fontWeight:'800',fontSize:17}}>{o.status==='delivered'?'Order arrived':o.status[0].toUpperCase()+o.status.slice(1)}</Txt><Txt style={s.small}>{money(o.total)} · {new Date(o.created).toLocaleString('en-IN')}</Txt></View></View><Txt style={{marginTop:10}}>{o.shop}</Txt><ScrollView horizontal style={{marginTop:12}}>{o.lines.map(l=><View key={l.id} style={s.orderItem}>{photo(l.photo)?<Image source={{uri:photo(l.photo)!}} style={s.cartPhoto} resizeMode="contain"/>:<Camera color={muted}/>}<Txt style={s.small} lines={2}>{l.qty} × {l.name}</Txt></View>)}</ScrollView><Txt style={s.small}>Deliver to · {o.address}, {o.pin}</Txt>{o.position&&<Pressable onPress={()=>Linking.openURL('https://www.google.com/maps/search/?api=1&query='+o.position!.lat+','+o.position!.lng)}><Txt style={{color:green,marginTop:8}}>View rider location</Txt></Pressable>}{o.status==='placed'&&<Button style={{marginTop:15}} onPress={()=>Alert.alert('Cancel order?','This order has not yet been accepted by the shop.',[{text:'Keep order'},{text:'Cancel order',style:'destructive',onPress:async()=>{try{await api('transition',{id:o.id,to:'cancelled'});setRefresh(v=>v+1)}catch(e:any){Alert.alert('Could not cancel',e.message)}}}])}>Cancel order</Button>}</View>):<Empty icon={<PackageOpen size={40} color={green}/>} title="No orders yet" detail="Your orders will appear here after checkout." action="Browse products" onPress={()=>navigate('home')}/>}</ScrollView>}
 {page==='addresses'&&<ScrollView contentContainerStyle={s.content}><Button onPress={()=>{setEditing({label:'Home',address:'',pin:''});setLocationOpen(true)}}>+ Add new address</Button>{addresses.map(a=><Pressable key={a.id} style={s.menuRow} onPress={()=>changePlace(a)}><House color={green}/><View style={{flex:1,marginLeft:12}}><Txt style={{fontWeight:'700'}}>{a.label}</Txt><Txt style={s.small}>{a.address} · {a.pin}</Txt></View><IconButton onPress={()=>{setEditing(a);setLocationOpen(true)}}><Txt style={{color:green}}>Edit</Txt></IconButton></Pressable>)}</ScrollView>}
 {page==='privacy'&&<View style={s.content}><Txt style={s.h2}>Your information on NearbyNow</Txt><Txt>Your saved addresses and order history are linked to your signed-in account. Shops see orders placed with them; assigned riders see delivery details needed to complete a delivery.</Txt><Button style={{marginTop:24}} onPress={()=>navigate('addresses')}>Manage saved addresses</Button></View>}
  {mainTabs.some(tab => tab.page === page) && (
    <View style={s.bottomNav}>
      {mainTabs.map(({ page: destination, title, Icon }) => {
        const selected = page === destination;
        const cartCount = destination === 'cart' ? units : 0;
        return (
          <Pressable
            key={destination}
            accessibilityRole="tab"
            accessibilityLabel={cartCount ? `${title}, ${cartCount} items` : title}
            accessibilityState={{ selected }}
            style={s.navTab}
            onPress={() => navigate(destination)}
          >
            <View style={[s.navIcon, selected && s.navActive]}>
              <Icon size={21} color={green} />
              {cartCount > 0 && <View style={s.badge}><Txt style={s.badgeText}>{cartCount}</Txt></View>}
            </View>
            <Txt style={[s.navLabel, selected && s.navActiveLabel]}>{title}</Txt>
          </Pressable>
        );
      })}
    </View>
  )}
 <Modal visible={locationOpen} animationType="slide" onRequestClose={closeLocation}><SafeAreaView style={s.modalRoot}><View style={s.header}><Txt style={s.h2}>Change location</Txt><IconButton onPress={closeLocation}><X color={dark}/></IconButton></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}><Button disabled={locationBusy} onPress={detect}>{locationBusy?'Detecting…':'◎  Detect my location'}</Button><TextInput style={[s.searchBar,{marginTop:18}]} placeholder="Search delivery location" value={locationQuery} onChangeText={setLocationQuery}/>{locationQuery.length>=3&&<>{suggestions.map((a,i)=><Pressable key={a.address+i} style={s.menuRow} onPress={()=>setEditing({label:'Home',address:a.address,pin:a.pin||''})}><MapPin color={green}/><View style={{flex:1,marginLeft:12}}><Txt style={{fontWeight:'700'}}>{a.name}</Txt><Txt style={s.small}>{a.address}</Txt></View></Pressable>)}{shops.map((a,i)=><Pressable key={a.name+i} style={s.menuRow} onPress={()=>changePlace({label:a.name+' area',address:'',pin:a.pin})}><Store color={green}/><Txt style={{marginLeft:12}}>{a.address} · {a.pin}</Txt></Pressable>)}{/^[1-9]\d{5}$/.test(locationQuery)&&<Button onPress={()=>changePlace({label:'Delivery area',address:'',pin:locationQuery})}>Use {locationQuery}</Button>}</>}{editing&&<View style={[s.card,{marginTop:18}]}><Txt style={s.h2}>{editing.id?'Edit address':'Confirm address'}</Txt><TextInput style={s.addressInput} placeholder="Label (Home or Work)" value={editing.label} onChangeText={v=>setEditing({...editing,label:v})}/><TextInput style={s.addressInput} placeholder="Flat, street, landmark and city" value={editing.address} onChangeText={v=>setEditing({...editing,address:v})}/><TextInput style={s.addressInput} placeholder="Six-digit PIN code" keyboardType="number-pad" maxLength={6} value={editing.pin} onChangeText={v=>setEditing({...editing,pin:v})}/><Button onPress={saveAddress}>Save address</Button>{editing.address&&/^[1-9]\d{5}$/.test(editing.pin)&&<Pressable onPress={()=>changePlace(editing)} style={{padding:15,alignItems:'center'}}><Txt style={{color:green}}>Use without saving</Txt></Pressable>}</View>}<Txt style={[s.h2,{marginTop:25}]}>Your saved addresses</Txt>{!editing&&<Pressable accessibilityRole="button" onPress={addDeliveryAddress} style={s.menuRow}><Plus size={20} color={green}/><Txt style={{marginLeft:12,fontWeight:'700'}}>Add new address</Txt></Pressable>}{addresses.map(a=><Pressable key={a.id} style={s.menuRow} onPress={()=>changePlace(a)}><House color={green}/><View style={{flex:1,marginLeft:12}}><Txt style={{fontWeight:'700'}}>{a.label}</Txt><Txt style={s.small}>{a.address} · {a.pin}</Txt></View><IconButton onPress={()=>setEditing(a)}><Txt style={{color:green}}>Edit</Txt></IconButton></Pressable>)}</ScrollView></SafeAreaView></Modal>
 </SafeAreaView>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'white',paddingTop:Platform.OS==='android'?(StatusBar.currentHeight??0):0},modalRoot:{flex:1,backgroundColor:'white'},center:{flex:1,justifyContent:'center',alignItems:'center',gap:12},auth:{flex:1,backgroundColor:bg,alignItems:'center',justifyContent:'center',padding:24},authBox:{padding:28,borderRadius:18,backgroundColor:'white',width:'100%',borderWidth:1,borderColor:line},logo:{flexDirection:'row',alignItems:'center',gap:7},brand:{fontSize:23,fontWeight:'900',color:dark,letterSpacing:-1},title:{fontSize:25,fontWeight:'800',color:dark,marginVertical:12},text:{fontSize:15,color:dark},small:{color:muted,fontSize:12,marginTop:3},h2:{fontSize:21,fontWeight:'800',color:dark,marginVertical:12},button:{backgroundColor:green,borderRadius:10,paddingVertical:14,paddingHorizontal:18,alignItems:'center'},google:{borderWidth:1,borderColor:line,borderRadius:10,padding:15,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:12},header:{minHeight:61,borderBottomWidth:1,borderColor:line,paddingHorizontal:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'white'},badge:{position:'absolute',right:0,top:0,backgroundColor:green,borderRadius:20,minWidth:16,minHeight:16,paddingHorizontal:2,alignItems:'center',justifyContent:'center'},content:{padding:18,paddingBottom:35},searchBar:{borderWidth:1,borderColor:line,borderRadius:12,minHeight:49,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'#f8faf7'},searchInput:{flex:1,fontSize:16,color:dark,marginLeft:10},
 storefrontHeader: {paddingHorizontal:18,paddingTop:8,backgroundColor:'#f5f8f3',borderBottomWidth:1,borderColor:line},
 storefrontTopRow: {flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:46},
 brandAccent: {color:'#63874f'},
 profileButton: {width:44,height:44,borderRadius:22,borderWidth:1,borderColor:'#d9e4d8',backgroundColor:'white',alignItems:'center',justifyContent:'center'},
 pressed: {opacity:.72},
 locationButton: {flexDirection:'row',alignItems:'center',gap:9,minHeight:48,alignSelf:'stretch',marginTop:5,marginBottom:9},
 locationText: {flex:1,minWidth:0},
 locationCaption: {fontSize:12,fontWeight:'600',color:muted},
 locationAddress: {fontSize:16,fontWeight:'800',marginTop:1},
 homeSearch: {flexDirection:'row',alignItems:'center',gap:12,minHeight:50,paddingHorizontal:14,borderRadius:13,backgroundColor:'#213f33'},
 homeSearchText: {color:'#f0f5ef',fontSize:15,flexShrink:1},
 pageTitle: {flex:1,marginLeft:14,fontWeight:'800',fontSize:19},
 badgeText: {color:'white',fontSize:10,fontWeight:'700'},
 screenScroll: {flex:1},
 homeContent: {paddingHorizontal:18,paddingTop:13,paddingBottom:24},
 hero: {backgroundColor:'#154a38',borderRadius:17,paddingHorizontal:17,paddingVertical:16,flexDirection:'row',alignItems:'center',gap:12,marginBottom:6},
 heroTitle: {color:'white',fontSize:22,fontWeight:'800',lineHeight:28,flex:1},
 heroIcon: {width:60,height:60,borderRadius:18,backgroundColor:'#275842',alignItems:'center',justifyContent:'center'},
 categoryStrip: {flexGrow:0,marginHorizontal:-18,marginTop:8},
 categories: {paddingHorizontal:12},
 category: {minWidth:62,alignItems:'center',justifyContent:'center',gap:3,paddingHorizontal:9,paddingTop:3,paddingBottom:7,borderBottomWidth:3,borderBottomColor:'transparent'},
 categorySelected: {borderBottomColor:green},
 categoryIcon: {width:34,height:31,borderRadius:9,alignItems:'center',justifyContent:'center'},
 categoryIconSelected: {backgroundColor:'#e5efde'},
 categoryLabel: {textAlign:'center',fontWeight:'600',fontSize:12,color:muted},
 categoryLabelSelected: {fontWeight:'800',color:green},
 grid:{flexDirection:'row',flexWrap:'wrap',columnGap:10},productActions:{marginTop:'auto',alignItems:'flex-start',gap:6},product:{width:(Dimensions.get('window').width-46)/2,borderWidth:1,borderColor:line,borderRadius:12,backgroundColor:'white',overflow:'hidden',marginBottom:10,minHeight:254},productImage:{height:132,backgroundColor:'#fafbf9',justifyContent:'center',alignItems:'center'},productPhoto:{width:'100%',height:'100%'},noPhoto:{alignItems:'center',justifyContent:'center',gap:7},add:{borderWidth:1,borderColor:green,paddingHorizontal:12,paddingVertical:6,borderRadius:6,backgroundColor:'#f8fff5'},stepper:{backgroundColor:'#29820d',borderRadius:6,flexDirection:'row',alignItems:'center',justifyContent:'space-between',minWidth:104},empty:{backgroundColor:bg,borderRadius:18,padding:28,alignItems:'center',justifyContent:'center',marginVertical:20,borderWidth:1,borderColor:'#dfe8db',minHeight:190},suggestion:{flexDirection:'row',alignItems:'center',paddingVertical:8},detailImage:{height:340,marginHorizontal:18,marginTop:18,backgroundColor:'#f8faf8',borderRadius:14,alignItems:'center',justifyContent:'center'},purchase:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginVertical:24},card:{backgroundColor:'white',borderRadius:14,padding:16,marginBottom:13,borderWidth:1,borderColor:line},cartRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderTopWidth:1,borderColor:line},cartPhoto:{width:58,height:62},bill:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginVertical:5},cartBottom:{backgroundColor:'white',padding:15,borderTopWidth:1,borderColor:line},addressInput:{borderWidth:1,borderColor:line,borderRadius:9,padding:11,marginVertical:8,color:dark,minHeight:48},menuRow:{flexDirection:'row',alignItems:'center',paddingVertical:17,borderBottomWidth:1,borderColor:line},orderItem:{width:105,alignItems:'center',marginRight:10,marginBottom:12},bottomNav:{flexDirection:'row',paddingVertical:5,borderTopWidth:1,borderColor:line,backgroundColor:'white'},
 productPage: {paddingBottom:28},
 productBody: {paddingHorizontal:18,paddingTop:12},
 productHighlights: {flexDirection:'row',alignItems:'stretch',gap:7},
 highlightTile: {flex:1,minWidth:0,paddingHorizontal:9,paddingVertical:10,justifyContent:'center',borderRadius:11,backgroundColor:bg,borderWidth:1,borderColor:line,gap:3},
 highlightValue: {fontSize:13,fontWeight:'800'},
 detailsButton: {flexShrink:1,maxWidth:'32%',minHeight:48,paddingHorizontal:10,paddingVertical:8,backgroundColor:green,borderRadius:11,justifyContent:'center',alignItems:'center'},
 detailsButtonText: {fontSize:13,color:'white',fontWeight:'800',textAlign:'center'},
 relatedProducts: {gap:10},
 detailsOverlay: {flex:1,justifyContent:'flex-end',backgroundColor:'rgba(10,32,23,.48)'},
 detailsSheet: {backgroundColor:'white',maxHeight:'82%',borderTopLeftRadius:23,borderTopRightRadius:23,overflow:'hidden'},
 detailsSheetHeader: {flexDirection:'row',gap:11,alignItems:'center',padding:16,borderBottomWidth:1,borderColor:line},
 detailsSheetTitle: {fontSize:19,fontWeight:'800',marginTop:2},
 detailsThumb: {width:48,height:48,borderRadius:9,backgroundColor:bg},
 detailsSheetContent: {paddingHorizontal:17,paddingBottom:25},
 detailRow: {flexDirection:'row',gap:12,paddingVertical:13,borderBottomWidth:1,borderColor:line},
 detailRowLabel: {flex:1,fontWeight:'700'},
 detailRowValue: {flex:1.4,color:muted},
 navTab: {flex:1,minHeight:48,alignItems:'center',justifyContent:'center',gap:2},
 navIcon: {minWidth:47,minHeight:27,borderRadius:14,alignItems:'center',justifyContent:'center'},
 navActive: {backgroundColor:'#e5efde'},
 navLabel: {color:muted,fontSize:11,fontWeight:'600'},
 navActiveLabel: {color:green,fontWeight:'800'}});
