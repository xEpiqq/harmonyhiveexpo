import React from 'react';
import { useState, useEffect, useRef } from 'react';
import firestore from '@react-native-firebase/firestore';
import AudioPlayer from './components/AudioPlayer';
import storage from '@react-native-firebase/storage';
import { createRef } from 'react';
import { View, Text, TouchableOpacity, Image, StatusBar, Animated, SafeAreaView, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { GestureHandlerRootView, ScrollView as GestureScrollView, PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';


const GameScreen = ({ user, setIsLoading, setShowBottomNav }) => {
  const { width: screenWidth } = Dimensions.get('window');

    const [musicSelected, setMusicSelected] = useState(false);
    const [songs, setSongs] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedSong, setSelectedSong] = useState(null);
    const spinValue = useRef(new Animated.Value(0)).current;
    const [choirName, setChoirName] = useState('');   // State for storing the choir name
    const [player, setPlayer] = useState(null);
    const [paused, setPaused] = useState(true);
    const [chatScreen, setChatScreen] = useState(false);
    const [profileScreen, setProfileScreen] = useState(false);
    const [choirId, setChoirId] = useState(null);

    const scrollViewRef = useRef(null);

    const scrollToNextPage = () => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: screenWidth, animated: true });
      }
    };
  
    const scrollToPrevPage = () => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, animated: true });
      }
    };
    // handle audio and video
  
    const handleSelectSong = song => {
      setSelectedSong(song);
      setMusicSelected(true);
      setShowBottomNav(false)
      // Optionally stop the current player if any
      if (player) {
        player.pause();
      }
    };
  
    // Subscribe to users firestore and retrieve choir_selected
    useEffect(() => {
      let userSubscriberUnsubscribe = () => {};
      let choirSubscriberUnsubscribe = () => {};
      
      setIsLoading(true);

      // Subscribe to user data to get the selected choir
      const userSubscriber = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot(userDocumentSnapshot => {
          const userData = userDocumentSnapshot.data();
          const selectedChoir = userData?.choir_selected;
          setChoirId(selectedChoir);
          
          // Fetch choir name and songs if a choir is selected
          if (selectedChoir) {
            // Fetch the choir document to get the choir name
            firestore().collection('choirs').doc(selectedChoir).get().then(choirDoc => {
              if (choirDoc.exists) {
                const choirData = choirDoc.data();
                setChoirName(choirData.name); // Store the choir name in state
  
                // Subscribe to songs in the selected choir
                const choirSubscriber = firestore()
                  .collection('choirs')
                  .doc(selectedChoir)
                  .collection('songs')
                  .onSnapshot(snapshot => {
                    const songsData = snapshot.docs.map(doc => ({
                      songId: doc.id,
                      name: doc.data().name,
                      files: doc.data().files || []
                    }));
                    setSongs(songsData);
                    console.log(songsData);
                    setIsLoading(false)
                  });
                
                choirSubscriberUnsubscribe = choirSubscriber; // Store unsubscribe function for cleanup
                setIsLoading(false)
              } else {
                setChoirName('No choir found');
                setIsLoading(false)
              }
            }).catch(error => {
              console.error("Error fetching choir details:", error);
              setChoirName('Error fetching choir');
              setIsLoading(false)
            });
          } else {
            setChoirName('No choir selected');
            setIsLoading(false)
          }
        });
  
      userSubscriberUnsubscribe = userSubscriber; // Store unsubscribe function for cleanup
  
      return () => {
        userSubscriberUnsubscribe();
        choirSubscriberUnsubscribe();
      };
    }, [user.uid]);
    
    useEffect(() => {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 30000,
          useNativeDriver: true,
        }),
        { iterations: -1 }
      ).start();
    }, [spinValue]);
  
    const spin = spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '7000deg'],
    });
  
  
    const handleScroll = (event) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const screenWidth = event.nativeEvent.layoutMeasurement.width;
      const pageIndex = Math.floor(contentOffsetX / screenWidth);
      setCurrentPage(pageIndex);
    };
  
    const handleBackToSongs = () => {
      setMusicSelected(false);
      setSelectedSong(null);
      setShowBottomNav(true)
    };

    async function getDownloadLink(url) {
      const downloadURL = await storage().ref(url).getDownloadURL()
      console.log(downloadURL);
    }

    useEffect(() => {
      const fetchDownloadURLs = async () => {
        if (selectedSong && selectedSong.files) {
          const downloadURLs = await Promise.all(
            selectedSong.files.map(async (file) => {
              try {
                const downloadURL = await storage().ref(file.url).getDownloadURL();
                return { ...file, downloadURL };
              } catch (error) {
                console.error('Error getting download URL:', error);
                return file;
              }
            })
          );
          setSelectedSong({ ...selectedSong, files: downloadURLs });
        }
      };
    
      fetchDownloadURLs();
    }, [selectedSong]);

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>

      <View className="flex-1">
  
        {/* { chatScreen? ( <ChatScreen 
        onBack={() => setChatScreen(false)} choirId={choirId} user={user}/> )  */}

        { chatScreen? ( <View></View> ) 
        
        : ( 
          <>
        {/* Status Bar */}
        <StatusBar barStyle="light-content" backgroundColor="#FFCE00" />
          <Text className=' text-slate-900'>{choirName}</Text>
  
        {/* Top Bar */}
        <View className="flex-row justify-between px-4 py-3 items-center bg-[#FFCE00]">
          {/* Left Side */}
          <View className="flex-row items-center">
            <Image source={require('../../public/duo.png')} className="h-6 w-10" />
            <Text className="text-white ml-2">1</Text>
          </View>
          {/* Center */}
          <View className="flex-row items-center">
            <Text className="text-white mx-2">5636</Text>
            <Image source={require('../../public/duo.png')} className="h-6 w-6" />
          </View>
          {/* Right Side */}
          <View className="flex-row items-center">
            <Text className="text-white mr-2">5</Text>
            <Image source={require('../../public/duo.png')} className="h-6 w-6" />
          </View>
        </View>
          
        {!musicSelected && !selectedSong && (
        <View className="flex-row p-4 bg-[#FFCE00] flex justify-center border-b border-[#ddb516]">
          <Text className="text-white font-bold">SONG: {songs.length > 0 && currentPage < songs.length ? songs[currentPage].name.toUpperCase() : 'LOADING...'}</Text>
        </View>
      )}

          {musicSelected && selectedSong ? (
            <View style={{ flex: 1 }}>
              {selectedSong && selectedSong.files && (
                <>
                <ReactNativeZoomableView
                  maxZoom={30}
                  contentWidth={300}
                  contentHeight={150}
                  minZoom={1}
                  initialZoom={1}
                  bindToBorders={true}
                >
                  <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1 }}
                  >
                    <View className="w-screen h-screen">
                      <Image
                        source={require('../../public/worthypic.png')}
                        className="w-full h-full"
                      />
                    </View>
                    <View className="w-screen h-screen">
                      <Image
                        source={require('../../public/worthypic.png')}
                        className="w-full h-full"
                      />
                    </View>
                  </ScrollView>


                </ReactNativeZoomableView>

                  <View style={{ position: 'absolute', bottom: 10, left: 10 }}>
                  <TouchableOpacity onPress={scrollToPrevPage} style={{ padding: 10, backgroundColor: 'gray', borderRadius: 5 }}>
                    <Text style={{ color: 'white' }}>Previous</Text>
                  </TouchableOpacity>
                  </View>
                  <View style={{ position: 'absolute', bottom: 10, right: 10 }}>
                  <TouchableOpacity onPress={scrollToNextPage} style={{ padding: 10, backgroundColor: 'gray', borderRadius: 5 }}>
                    <Text style={{ color: 'white' }}>Next</Text>
                  </TouchableOpacity>
                  </View>
                </>

              )}
            </View>

          ) : (
  
          <>
                <Text className='bg-white font-thin'>Stats~</Text>
                <Text className='bg-white font-thin'>Last Opened: May 5th</Text>
                <GestureScrollView
                  className="flex"
                  horizontal={true}
                  pagingEnabled={true}
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ flexGrow: 1 }}
                >
                
                  {songs.map((song, index) => (


                    <View key={song.songId} className="w-screen h-screen flex items-center justify-center bg-white -mt-36">
                      <TouchableOpacity
                      onPress={() => handleSelectSong(song)}>

                      <View className='relative flex items-center justify-center'>

                          <Image
                            source={require('../../public/cherryblossom.png')}
                            className='absolute w-screen h-16 -z-10'
                          />

                        <Animated.Image
                          source={require('../../public/musicdisk.png')}
                          style={{ width: 120, height: 120, transform: [{ rotate: spin }] }}
                        />

                      </View>
  
                        <Text className="text-center font-bold mt-5 text-5xl">{song.name.toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
  
                </GestureScrollView>
  
              <View className="flex-row justify-center p-4 -mt-28">
                {songs.map((_, index) => (
                  <View
                    key={index}
                    className={`h-2 w-2 rounded-full m-1 ${currentPage === index ? 'bg-gray-500' : 'bg-gray-300'}`}
                  />
                ))}
              </View>
  
            </>
          )}
        </>
        )}
  
      </View>
      </GestureHandlerRootView>

    );
   
  }

 
export default GameScreen