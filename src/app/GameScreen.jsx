import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { View, Text, TouchableOpacity, Image, StatusBar, Animated, Dimensions, FlatList } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';

const GameScreen = ({ user, setIsLoading, setShowBottomNav }) => {
  const { width: screenWidth } = Dimensions.get('window');

  const [musicSelected, setMusicSelected] = useState(false);
  const [songs, setSongs] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedSong, setSelectedSong] = useState(null);
  const spinValue = useRef(new Animated.Value(0)).current;
  const [choirName, setChoirName] = useState('');
  const [player, setPlayer] = useState(null);
  const [chatScreen, setChatScreen] = useState(false);
  const [choirId, setChoirId] = useState(null);
  const [lastOpened, setLastOpened] = useState({});

  const scrollViewRef = useRef(null);

  const scrollToNextPage = useCallback(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToOffset({ offset: screenWidth * (currentPage + 1), animated: true });
    }
  }, [screenWidth, currentPage]);

  const scrollToPrevPage = useCallback(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToOffset({ offset: screenWidth * (currentPage - 1), animated: true });
    }
  }, [screenWidth, currentPage]);

  const handleSelectSong = useCallback((song) => {
    setSelectedSong(song);
    setMusicSelected(true);
    setShowBottomNav(false);
    if (player) {
      player.pause();
    }
    updateLastOpenedDate(song.songId);
  }, [player, setShowBottomNav]);

  const updateLastOpenedDate = useCallback((songId) => {
    const currentDate = new Date().toISOString();
    firestore()
      .collection('users')
      .doc(user.uid)
      .update({
        [`lastOpened.${songId}`]: currentDate
      })
      .then(() => {
        setLastOpened(prevState => ({ ...prevState, [songId]: currentDate }));
      })
      .catch(error => {
        console.error('Error updating last opened date:', error);
      });
  }, [user.uid]);

  const formatDate = useCallback((dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }, []);

  useEffect(() => {
    let userSubscriberUnsubscribe = () => {};
    let choirSubscriberUnsubscribe = () => {};
    
    setIsLoading(true);

    const userSubscriber = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(userDocumentSnapshot => {
        const userData = userDocumentSnapshot.data();
        const selectedChoir = userData?.choir_selected;
        setChoirId(selectedChoir);
        setLastOpened(userData?.lastOpened || {});

        if (selectedChoir) {
          firestore().collection('choirs').doc(selectedChoir).get().then(choirDoc => {
            if (choirDoc.exists) {
              const choirData = choirDoc.data();
              setChoirName(choirData.name);

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
                  setIsLoading(false);
                });
              
              choirSubscriberUnsubscribe = choirSubscriber;
              setIsLoading(false);
            } else {
              setChoirName('No choir found');
              setIsLoading(false);
            }
          }).catch(error => {
            console.error("Error fetching choir details:", error);
            setChoirName('Error fetching choir');
            setIsLoading(false);
          });
        } else {
          setChoirName('No choir selected');
          setIsLoading(false);
        }
      });

    userSubscriberUnsubscribe = userSubscriber;

    return () => {
      userSubscriberUnsubscribe();
      choirSubscriberUnsubscribe();
    };
  }, [user.uid, setIsLoading]);

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

  const spin = useMemo(() => spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '7000deg'],
  }), [spinValue]);

  const fetchDownloadURLs = useCallback(async () => {
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
  }, [selectedSong]);

  useEffect(() => {
    fetchDownloadURLs();
  }, [fetchDownloadURLs]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentPage(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50
  }), []);

  const renderItem = useCallback(({ item: song }) => (
    <View key={song.songId} className="w-screen h-screen flex items-center justify-center bg-white -mt-36">
      <TouchableOpacity onPress={() => handleSelectSong(song)}>
        <Text className='bg-white font-thin'>Last Opened: {lastOpened[song.songId] ? formatDate(lastOpened[song.songId]) : 'NEVER...'}</Text>
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
  ), [handleSelectSong, lastOpened, formatDate, spin]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1">
        {chatScreen ? (
          <View></View>
        ) : (
          <>
            <View style={{ paddingTop: 30 }}>
              <StatusBar barStyle="light-content" backgroundColor="#FFCE00" />
            </View>

            <View className="flex-row justify-between px-4 py-3 items-center bg-[#FFCE00]">
              <View className="flex-row items-center">
                <Image source={require('../../public/honeycomb.png')} className="h-10 w-10" />
                <Text className="text-white ml-2">1</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white mx-2">2356</Text>
                <Image source={require('../../public/honeycomb.png')} className="h-6 w-6" />
              </View>
              <View className="flex-row items-center">
                <Text className="text-white mr-2">5</Text>
                <Image source={require('../../public/honeycomb.png')} className="h-6 w-6" />
              </View>
            </View>
            {!musicSelected && !selectedSong && (
              <View className="flex-row p-4 bg-[#FFCE00] flex justify-center border-b border-[#ddb516]">
                <Text className="text-white font-bold">{choirName.toUpperCase()}</Text>
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
                      <FlatList
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        data={selectedSong.files}
                        renderItem={({ item }) => (
                          // <View className="w-screen h-screen">
                          //   <Image
                          //     source={{ uri: item.downloadURL }}
                          //     className="w-full h-full"
                          //   />
                          // </View>
                        
                          <View className="w-screen h-screen">
                          <Image
                            source={require('../../public/worthypic.png')}
                            className="w-full h-full"
                          />
                        </View>

                        )}
                        keyExtractor={(item, index) => index.toString()}
                      />
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
                <FlatList
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  data={songs}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.songId}
                  contentContainerStyle={{ flexGrow: 1 }}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                />
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
};

export default GameScreen;
