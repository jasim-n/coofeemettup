import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import type { FeaturedImageDto } from '@jrst/api-client';
import { categoryIcon, splitCategories } from '../lib/category-icon';
import { isVideoUrl, resolveMediaUrl } from '../lib/media-url';
import { PRIMARY } from '../theme';

/**
 * Ported from apps/web/src/components/featured-showcase.tsx.
 * Full-bleed carousel: photos, muted reels (expo-av), collage grids.
 */
export function FeaturedShowcase({
  slides,
  onOpenTable,
}: {
  slides: FeaturedImageDto[];
  onOpenTable: (tableId: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const width = Dimensions.get('window').width - 32; // home scroll padding 16*2
  const height = 272; // ~ web h-[17rem]
  const n = slides.length;
  const active = slides[idx % Math.max(n, 1)];
  const dwellMs = active?.kind === 'VIDEO' ? 8000 : active?.kind === 'COLLAGE' ? 5500 : 4000;

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % n;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, dwellMs);
    return () => clearInterval(t);
  }, [n, paused, dwellMs, width]);

  if (n === 0) return null;

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    setIdx(Math.round(x / width));
  }

  return (
    <View
      style={{ height, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' }}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        decelerationRate="fast"
      >
        {slides.map((slide, i) => {
          const heading = slide.tableTitle ?? slide.category;
          const cats = splitCategories(slide.category).slice(0, 3);
          return (
            <Pressable
              key={slide.id}
              onPress={() => onOpenTable(slide.tableId)}
              style={{ width, height, backgroundColor: '#000' }}
            >
              <SlideMedia slide={slide} active={i === idx} width={width} height={height} />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  top: 0,
                  backgroundColor: 'transparent',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: 16,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                }}
              >
                {slide.caption ? (
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginBottom: 4 }} numberOfLines={2}>
                    {slide.caption}
                  </Text>
                ) : null}
                <Text
                  style={{
                    color: '#fff',
                    fontFamily: 'Poppins_700Bold',
                    fontSize: 18,
                  }}
                  numberOfLines={1}
                >
                  {heading}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {cats.map((c) => (
                    <View
                      key={c}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <Ionicons name={categoryIcon(c)} size={10} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Poppins_600SemiBold' }}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {n > 1 ? (
        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: 12,
            flexDirection: 'row',
            gap: 4,
          }}
        >
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SlideMedia({
  slide,
  active,
  width,
  height,
}: {
  slide: FeaturedImageDto;
  active: boolean;
  width: number;
  height: number;
}) {
  const videoRef = useRef<Video>(null);
  const url = resolveMediaUrl(slide.url);
  const poster = resolveMediaUrl(slide.posterUrl);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || slide.kind !== 'VIDEO') return;
    if (active) void v.playAsync().catch(() => undefined);
    else {
      void v.pauseAsync().catch(() => undefined);
      void v.setPositionAsync(0).catch(() => undefined);
    }
  }, [active, slide.kind]);

  if (slide.kind === 'VIDEO' && url) {
    return (
      <View style={{ width, height, backgroundColor: '#000' }}>
        <Video
          ref={videoRef}
          source={{ uri: url }}
          posterSource={poster ? { uri: poster } : undefined}
          usePoster={!!poster}
          style={{ width, height }}
          resizeMode={ResizeMode.COVER}
          isMuted
          isLooping
          shouldPlay={active}
        />
        <View
          style={{
            position: 'absolute',
            left: 16,
            top: 40,
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <Badge label="Reel" />
        </View>
      </View>
    );
  }

  if (slide.kind === 'COLLAGE') {
    const urls = [slide.url, ...slide.collageUrls]
      .map((u) => resolveMediaUrl(u))
      .filter((u): u is string => !!u && !isVideoUrl(u));
    const cells = urls.slice(0, 4);
    return (
      <View style={{ width, height, backgroundColor: '#000' }}>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((u) => (
            <Image
              key={u}
              source={{ uri: u }}
              style={{
                width: cells.length === 1 ? width : width / 2,
                height: cells.length <= 2 ? height : height / 2,
              }}
              resizeMode="cover"
            />
          ))}
        </View>
        <View style={{ position: 'absolute', left: 16, top: 40 }}>
          <Badge label="Collage" />
        </View>
      </View>
    );
  }

  // PHOTO — never pass .mp4 to Image
  const photo = poster && isVideoUrl(url ?? '') ? poster : url && !isVideoUrl(url) ? url : poster;
  return (
    <View style={{ width, height, backgroundColor: '#000' }}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width, height }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.4)" />
        </View>
      )}
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 10,
          fontFamily: 'Poppins_700Bold',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

void PRIMARY;
