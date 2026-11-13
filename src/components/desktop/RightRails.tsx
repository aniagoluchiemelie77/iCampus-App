/**
 * Right-rail panels for the desktop layout (see DesktopShell). Each screen
 * gets the actions most useful next to it; anything without a panel shows
 * the ads banner.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAppSelector } from '../../hooks/hooks';
import { useSocket } from '../../hooks/useSocket';
import { useThemeToggle } from '../../hooks/useThemeToggle';
import {
  getAds,
  fetchNotificationsByTab,
  getStudentLecturesTimeline,
  getLecturersLecturesTimeline,
} from '../../api/localGetApis';
import { askIAssistantAgent } from '../../api/localPostApis';
import { fetchProductsByIdsFromLocalDb } from '../../hooks/useSQLiteDb';
import { navigateForNotification } from '../../utils/notificationNavigation';
import { safeParseDate } from '../../utils/dateFormatter';
import { resolveLectureTime } from '../../utils/lectureTime';
import { ACTION_CONFIG } from '../ExpandableFAB';
import AdBanner from '../AdsBanner';
import { UserAvatar } from '../UserAvatar';
import { CurrencyDisplay } from '../CurrencyFormatter';
import { RAIL_WIDTH } from './DesktopShell';
import { ProfileUrlEditor } from '../ProfileUrlEditor';
import { getProfileLinks, PROFILE_PATH } from '../../utils/profileLinks';
import type { AdItem } from '../../types/firebase';

const CARD_INNER_WIDTH = RAIL_WIDTH - 32;

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** The rail's own scroll area. */
export const RailScroll = ({ children }: { children: React.ReactNode }) => (
  <ScrollView
    style={styles.flex}
    contentContainerStyle={styles.scroll}
    showsVerticalScrollIndicator
  >
    {children}
  </ScrollView>
);

export const RailCard = ({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border + '40',
        },
      ]}
    >
      <View style={styles.cardHead}>
        {!!icon && <MaterialIcons name={icon} size={17} color={colors.primary} />}
        <Text style={[styles.cardTitle, { color: colors.textDarker }]}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
};

export const RailAction = ({
  icon,
  label,
  hint,
  onPress,
  primary,
  disabled,
}: {
  icon: string;
  label: string;
  hint?: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      style={[
        styles.action,
        primary
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.background },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: primary ? 'rgba(255,255,255,0.18)' : colors.primary + '14',
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={18}
          color={primary ? colors.btnTextColor : colors.primary}
        />
      </View>
      <View style={styles.flex}>
        <Text
          style={[
            styles.actionLabel,
            { color: primary ? colors.btnTextColor : colors.textDarker },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {!!hint && (
          <Text
            style={[
              styles.actionHint,
              { color: primary ? colors.btnTextColor : colors.text },
            ]}
            numberOfLines={1}
          >
            {hint}
          </Text>
        )}
      </View>
      <MaterialIcons
        name="chevron-right"
        size={18}
        color={primary ? colors.btnTextColor : colors.text}
      />
    </TouchableOpacity>
  );
};

const EmptyLine = ({ icon, text }: { icon: string; text: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyLine}>
      <MaterialIcons name={icon} size={20} color={colors.text} style={{ opacity: 0.5 }} />
      <Text style={[styles.emptyText, { color: colors.text }]}>{text}</Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Ads (the default panel)
// ---------------------------------------------------------------------------

// The rail remounts as screens change; one fetch per session is enough.
let adsCache: AdItem[] | null = null;
let adsRequest: Promise<AdItem[]> | null = null;
const loadAds = () => {
  if (adsCache) return Promise.resolve(adsCache);
  adsRequest ??= getAds()
    .then(r => (adsCache = r.success ? r.data : []))
    .catch(() => [])
    .finally(() => (adsRequest = null));
  return adsRequest;
};

export const useCachedAds = () => {
  const [ads, setAds] = useState<AdItem[] | null>(adsCache);
  useEffect(() => {
    let active = true;
    loadAds().then(list => active && setAds(list));
    return () => {
      active = false;
    };
  }, []);
  return { ads: ads ?? [], loading: ads === null };
};

export const AdsCard = () => {
  const { colors } = useTheme();
  const { ads, loading } = useCachedAds();
  return (
    <RailCard title="Sponsored" icon="campaign">
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : ads.length > 0 ? (
        <AdBanner ads={ads} width={CARD_INNER_WIDTH} />
      ) : (
        <EmptyLine icon="campaign" text="Nothing to show right now." />
      )}
    </RailCard>
  );
};

/**
 * Way back for the default rails (screens without their own panel), so a
 * user deep in the app can return to the feed and retrace their steps.
 */
const GoHomeCard = () => {
  const navigation = useNavigation<any>();
  return (
    <RailAction
      icon="home"
      label="Go to Home"
      hint="Back to your feed"
      onPress={() => navigation.navigate('Home', { activeTab: 'home' })}
    />
  );
};

const RailFooter = () => {
  const { colors } = useTheme();
  return (
    <Text style={[styles.footer, { color: colors.text }]}>
      iCampus © {new Date().getFullYear()}
    </Text>
  );
};

export const AdsRail = ({ showHome }: { showHome?: boolean }) => (
  <RailScroll>
    {showHome && <GoHomeCard />}
    <AdsCard />
    <RailFooter />
  </RailScroll>
);

// ---------------------------------------------------------------------------
// Feed (Home › Home): create actions + latest notifications
// ---------------------------------------------------------------------------

const CREATE_ACTIONS: { key: string; label: string; hint: string }[] = [
  { key: 'Create Post', label: 'Write a post', hint: 'Share an update' },
  { key: 'Create Poll', label: 'Start a poll', hint: 'Ask your network' },
  { key: 'Create Event', label: 'Create an event', hint: 'Invite people' },
  { key: 'Post Job', label: 'Post a job', hint: 'Hire or refer' },
  { key: 'iAssistant', label: 'Ask iAssistant', hint: 'Help with anything' },
];

const LatestNotificationsCard = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const user = useAppSelector((s: any) => s.user) || {};
  const { socket } = useSocket() || ({} as any);
  const [items, setItems] = useState<any[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetchNotificationsByTab('all');
    setItems(res.success ? res.notifications.slice(0, 5) : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!socket) return;
    socket.on('new_notification', load);
    return () => {
      socket.off('new_notification', load);
    };
  }, [socket, load]);

  return (
    <RailCard
      title="Latest notifications"
      icon="notifications"
      right={
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Text style={[styles.link, { color: colors.primary }]}>See all</Text>
        </TouchableOpacity>
      }
    >
      {items === null ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : items.length === 0 ? (
        <EmptyLine icon="notifications-none" text="You're all caught up." />
      ) : (
        items.map((n: any, i: number) => {
          const when = safeParseDate(n.createdAt || n.timestamp);
          const unread = n.isRead === false;
          return (
            <TouchableOpacity
              key={n.notificationId || n.id || i}
              style={[
                styles.notifRow,
                i > 0 && { borderTopColor: colors.border + '40', borderTopWidth: StyleSheet.hairlineWidth },
              ]}
              onPress={() =>
                navigateForNotification(navigation, n, {
                  uid: user.uid,
                  usertype: user.usertype,
                })
              }
            >
              <View
                style={[
                  styles.notifDot,
                  { backgroundColor: unread ? colors.primary : 'transparent' },
                ]}
              />
              <View style={styles.flex}>
                <Text
                  style={[styles.notifTitle, { color: colors.textDarker }]}
                  numberOfLines={1}
                >
                  {n.title || 'Notification'}
                </Text>
                {!!n.message && (
                  <Text style={[styles.notifBody, { color: colors.text }]} numberOfLines={2}>
                    {n.message}
                  </Text>
                )}
                {!!when && (
                  <Text style={[styles.notifTime, { color: colors.text }]}>
                    {moment(when).fromNow()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </RailCard>
  );
};

export const FeedRail = ({ showHome }: { showHome?: boolean }) => {
  const navigation = useNavigation<any>();
  return (
    <RailScroll>
      {showHome && <GoHomeCard />}
      <RailCard title="Create" icon="add-circle-outline">
        {CREATE_ACTIONS.map(({ key, label, hint }, i) => {
          const config = ACTION_CONFIG[key];
          return (
            <RailAction
              key={key}
              icon={config.icon}
              label={label}
              hint={hint}
              primary={i === 0}
              onPress={() => navigation.navigate(config.route, config.params)}
            />
          );
        })}
      </RailCard>
      <LatestNotificationsCard />
      <AdsCard />
      <RailFooter />
    </RailScroll>
  );
};

// ---------------------------------------------------------------------------
// Store: create listing + cart / favorites at a glance
// ---------------------------------------------------------------------------

const ProductLine = ({
  product,
  quantity,
}: {
  product: any;
  quantity?: number;
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const uri = product?.mediaUrls?.[0];
  return (
    <TouchableOpacity
      style={styles.productRow}
      onPress={() =>
        navigation.navigate('ProductDetails', { productId: product.productId })
      }
    >
      {uri ? (
        <Image source={{ uri }} style={styles.productThumb} />
      ) : (
        <View style={[styles.productThumb, styles.center, { backgroundColor: colors.primary + '14' }]}>
          <MaterialIcons name="image" size={18} color={colors.primary} />
        </View>
      )}
      <View style={styles.flex}>
        <Text style={[styles.productName, { color: colors.textDarker }]} numberOfLines={1}>
          {product.title || 'Product'}
        </Text>
        <View style={styles.productMeta}>
          <CurrencyDisplay value={Number(product.price) || 0} size="small" />
          {!!quantity && quantity > 1 && (
            <Text style={[styles.productQty, { color: colors.text }]}>× {quantity}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const StoreRail = ({ showHome }: { showHome?: boolean }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const user = useAppSelector((s: any) => s.user) || {};
  const [tab, setTab] = useState<'cart' | 'favorites'>('cart');
  const cart: any[] = user.cart ?? [];
  const favorites: string[] = user.favorites ?? [];
  const ids = tab === 'cart' ? cart.map(c => c.productId) : favorites;
  const products = useMemo(() => {
    try {
      return fetchProductsByIdsFromLocalDb(ids) as any[];
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('|')]);
  const qtyOf = (id: string) => cart.find(c => c.productId === id)?.quantity;
  const shown = products.slice(0, 5);

  return (
    <RailScroll>
      {showHome && <GoHomeCard />}
      <RailCard title="Sell on iCampus" icon="storefront">
        <RailAction
          icon="add-business"
          label="Create a listing"
          hint="Products, files or services"
          primary
          onPress={() => navigation.navigate('CreateProduct')}
        />
        <RailAction
          icon="insights"
          label="Sales Hub"
          hint="Orders, payouts and inventory"
          onPress={() => navigation.navigate('SalesHub')}
        />
      </RailCard>

      <RailCard title="Your items" icon="shopping-bag">
        <View style={[styles.segment, { backgroundColor: colors.background }]}>
          {(['cart', 'favorites'] as const).map(key => {
            const selected = tab === key;
            const count = key === 'cart' ? cart.length : favorites.length;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setTab(key)}
                style={[styles.segmentItem, selected && { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <MaterialIcons
                  name={key === 'cart' ? 'shopping-cart' : 'favorite'}
                  size={15}
                  color={selected ? colors.btnTextColor : colors.text}
                />
                <Text
                  style={[
                    styles.segmentText,
                    { color: selected ? colors.btnTextColor : colors.text },
                  ]}
                >
                  {key === 'cart' ? 'Cart' : 'Favorites'} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {shown.length === 0 ? (
          <EmptyLine
            icon={tab === 'cart' ? 'remove-shopping-cart' : 'favorite-border'}
            text={tab === 'cart' ? 'Your cart is empty.' : 'No favorites yet.'}
          />
        ) : (
          shown.map(p => (
            <ProductLine
              key={p.productId}
              product={p}
              quantity={tab === 'cart' ? qtyOf(p.productId) : undefined}
            />
          ))
        )}
        <TouchableOpacity
          style={styles.cardFooterLink}
          onPress={() =>
            navigation.navigate(tab === 'cart' ? 'CartScreen' : 'FavoritesScreen')
          }
        >
          <Text style={[styles.link, { color: colors.primary }]}>
            {tab === 'cart'
              ? cart.length
                ? 'Go to cart and checkout'
                : 'Open cart'
              : 'See all favorites'}
          </Text>
          <MaterialIcons name="arrow-forward" size={15} color={colors.primary} />
        </TouchableOpacity>
      </RailCard>
      <AdsCard />
      <RailFooter />
    </RailScroll>
  );
};

// ---------------------------------------------------------------------------
// Classroom: upload actions + upcoming lectures
// ---------------------------------------------------------------------------

// Same resolution as the Classroom "Today" card: startTime can be a bare
// "HH:mm" or week 1's instant for repeating lectures, so it can't be parsed
// on its own (that pushed every repeat lecture into the past).
const lectureStart = (l: any) => resolveLectureTime(l, 'start');
const lectureEnd = (l: any) => {
  const end = resolveLectureTime(l, 'end');
  if (end) return end;
  const start = lectureStart(l);
  return start ? new Date(start.getTime() + 2 * 60 * 60 * 1000) : null;
};

const UpcomingLecturesCard = ({ role }: { role: 'student' | 'lecturer' }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [lectures, setLectures] = useState<any[] | null>(null);

  useEffect(() => {
    let active = true;
    (role === 'lecturer' ? getLecturersLecturesTimeline() : getStudentLecturesTimeline())
      .then((res: any) => {
        if (!active) return;
        const list: any[] = res?.success && Array.isArray(res.data) ? res.data : [];
        const now = Date.now();
        setLectures(
          list
            .filter(l => !!l && l.status !== 'cancelled' && l.status !== 'completed')
            // Keep classes still running, not just ones yet to start.
            .filter(l => (lectureEnd(l)?.getTime() ?? 0) >= now)
            .sort(
              (a, b) =>
                (lectureStart(a)?.getTime() ?? 0) - (lectureStart(b)?.getTime() ?? 0),
            )
            .slice(0, 6),
        );
      })
      .catch(() => active && setLectures([]));
    return () => {
      active = false;
    };
  }, [role]);

  return (
    <RailCard title="Upcoming lectures" icon="event-note">
      {lectures === null ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : lectures.length === 0 ? (
        <EmptyLine icon="event-available" text="No lectures scheduled." />
      ) : (
        lectures.map((l, i) => {
          const start = lectureStart(l);
          const live = l.status === 'ongoing' || l.isLive;
          const online = l.lectureType === 'Online';
          return (
            <TouchableOpacity
              key={l.id || i}
              disabled={!online}
              style={[
                styles.lectureRow,
                i > 0 && { borderTopColor: colors.border + '40', borderTopWidth: StyleSheet.hairlineWidth },
              ]}
              onPress={() =>
                navigation.navigate('LiveClassSessions', {
                  lectureId: l.id,
                  courseId: l.courseId?.courseId || l.courseId,
                })
              }
            >
              <View style={[styles.dateBadge, { backgroundColor: colors.primary + '14' }]}>
                <Text style={[styles.dateDay, { color: colors.primary }]}>
                  {start ? moment(start).format('DD') : '--'}
                </Text>
                <Text style={[styles.dateMonth, { color: colors.primary }]}>
                  {start ? moment(start).format('MMM') : ''}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={[styles.lectureTitle, { color: colors.textDarker }]} numberOfLines={1}>
                  {l.topicName || 'Lecture'}
                </Text>
                <Text style={[styles.lectureMeta, { color: colors.text }]} numberOfLines={1}>
                  {[l.courseCode || l.courseInfo?.courseCode || l.courseId?.courseCode, start && moment(start).format('h:mm A'), l.lectureType]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {live && (
                <View style={styles.livePill}>
                  <Text style={styles.livePillText}>LIVE</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}
      <TouchableOpacity
        style={styles.cardFooterLink}
        onPress={() =>
          navigation.navigate('CourseSubPage', {
            title: 'View Lecture Schedule',
            userRole: role,
          })
        }
      >
        <Text style={[styles.link, { color: colors.primary }]}>Full schedule</Text>
        <MaterialIcons name="arrow-forward" size={15} color={colors.primary} />
      </TouchableOpacity>
    </RailCard>
  );
};

export const ClassroomRail = ({
  role,
  onUploadForm,
  onManualEntry,
  onQuickClass,
}: {
  role: 'student' | 'lecturer';
  onUploadForm: () => void;
  onManualEntry: () => void;
  onQuickClass?: () => void;
}) => (
  <RailScroll>
    <RailCard title="Add courses" icon="library-add">
      <RailAction
        icon="cloud-upload"
        label={role === 'lecturer' ? 'Upload allocation form' : 'Upload course form'}
        hint="PDF or photo, we fill it in"
        primary
        onPress={onUploadForm}
      />
      <RailAction
        icon="keyboard"
        label="Add manually"
        hint="Type in a course"
        onPress={onManualEntry}
      />
      {role === 'lecturer' && onQuickClass && (
        <RailAction
          icon="video-call"
          label="Quick online class"
          hint="Start a public session now"
          onPress={onQuickClass}
        />
      )}
    </RailCard>
    <UpcomingLecturesCard role={role} />
    <AdsCard />
    <RailFooter />
  </RailScroll>
);

// ---------------------------------------------------------------------------
// Profile: public link (copy / share / customise)
// ---------------------------------------------------------------------------

export const ProfileRail = ({
  profile,
  isOwner,
  onUsernameChange,
}: {
  profile: any;
  isOwner: boolean;
  /** Lets the profile screen follow a custom-URL change made here. */
  onUsernameChange?: (username: string) => void;
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [editorVisible, setEditorVisible] = useState(false);
  const links = getProfileLinks(profile);
  const name = profile?.organizationName || profile?.firstname || 'this profile';

  return (
    <RailScroll>
      <RailCard title={isOwner ? 'Your public profile' : 'Profile link'} icon="public">
        <View style={[styles.urlBox, { backgroundColor: colors.background }]}>
          <MaterialIcons name="link" size={16} color={colors.primary} />
          <Text style={[styles.urlText, { color: colors.textDarker }]} numberOfLines={1}>
            {links.display}
          </Text>
        </View>
        <RailAction
          icon="content-copy"
          label="Copy profile URL"
          primary
          onPress={() => {
            Clipboard.setString(links.url);
            Toast.show({ type: 'success', text2: 'Profile link copied' });
          }}
        />
        <RailAction
          icon="ios-share"
          label="Share profile"
          onPress={() =>
            Share.share({ message: `Check out ${name} on iCampus: ${links.url}` }).catch(() => {})
          }
        />
        {isOwner && (
          <RailAction
            icon="edit"
            label="Edit your custom URL"
            hint={links.hasCustomUrl ? `${PROFILE_PATH.slice(1)}${links.handle}` : 'Choose a custom name'}
            onPress={() => setEditorVisible(true)}
          />
        )}
      </RailCard>
      {isOwner && (
        <ProfileUrlEditor
          visible={editorVisible}
          onClose={() => setEditorVisible(false)}
          profile={profile}
          onSaved={onUsernameChange}
        />
      )}
      {isOwner && (
        <RailCard title="Profile strength" icon="trending-up">
          {[
            { done: !!profile?.bio?.trim(), label: 'Write an About section' },
            { done: (profile?.skills?.length || 0) > 0, label: 'Add your skills' },
            { done: !!profile?.headline, label: 'Add a headline' },
            { done: profile?.isVerified === true, label: 'Get verified', route: 'PersonaVerify' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.checkRow}
              disabled={item.done}
              onPress={() => navigation.navigate(item.route || 'EditProfile')}
            >
              <MaterialIcons
                name={item.done ? 'check-circle' : 'radio-button-unchecked'}
                size={18}
                color={item.done ? colors.success : colors.text}
              />
              <Text
                style={[
                  styles.checkText,
                  { color: colors.textDarker },
                  item.done && styles.checkDone,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </RailCard>
      )}
      <AdsCard />
      <RailFooter />
    </RailScroll>
  );
};

// ---------------------------------------------------------------------------
// Settings: appearance + iAssistant chat
// ---------------------------------------------------------------------------

type ChatLine = { role: 'user' | 'model'; content: string };

const AssistantChatCard = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const user = useAppSelector((s: any) => s.user) || {};
  const [lines, setLines] = useState<ChatLine[]>([
    { role: 'model', content: `Hi ${user.firstname || 'there'}! Ask me anything about iCampus.` },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const history = lines.slice(1);
    setLines(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setBusy(true);
    try {
      const res = await askIAssistantAgent({
        message: text,
        history,
        contextType: 'general',
        contextData: { title: 'Settings' },
        userState: user,
      });
      setLines(prev => [
        ...prev,
        {
          role: 'model',
          content:
            res.success && res.reply
              ? res.reply.trim()
              : res.error || "Sorry, I couldn't answer that. Try again.",
        },
      ]);
    } catch {
      setLines(prev => [
        ...prev,
        { role: 'model', content: "Couldn't reach the assistant. Check your connection." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <RailCard
      title="iAssistant"
      icon="auto-awesome"
      right={
        <TouchableOpacity
          onPress={() =>
            navigation.navigate(ACTION_CONFIG.iAssistant.route, ACTION_CONFIG.iAssistant.params)
          }
          accessibilityLabel="Open full chat"
        >
          <MaterialIcons name="open-in-full" size={17} color={colors.primary} />
        </TouchableOpacity>
      }
    >
      <ScrollView
        ref={scrollRef}
        style={styles.chatBox}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {lines.map((line, i) => {
          const mine = line.role === 'user';
          return (
            <View
              key={i}
              style={[
                styles.bubble,
                mine
                  ? [styles.bubbleMine, { backgroundColor: colors.primary }]
                  : [styles.bubbleTheirs, { backgroundColor: colors.background }],
              ]}
            >
              <Text
                selectable
                style={[styles.bubbleText, { color: mine ? colors.btnTextColor : colors.text }]}
              >
                {line.content}
              </Text>
            </View>
          );
        })}
        {busy && (
          <View style={[styles.bubble, styles.bubbleTheirs, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>
      <View style={[styles.chatInputRow, { borderColor: colors.border + '80' }]}>
        <TextInput
          style={[styles.chatInput, { color: colors.text }]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask iAssistant…"
          placeholderTextColor={colors.inputTextHolder}
          onSubmitEditing={send}
          returnKeyType="send"
          editable={!busy}
        />
        <TouchableOpacity onPress={send} disabled={busy || !input.trim()} accessibilityLabel="Send">
          <MaterialIcons
            name="send"
            size={20}
            color={input.trim() && !busy ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>
    </RailCard>
  );
};

export const SettingsRail = ({ showHome }: { showHome?: boolean }) => {
  const { colors } = useTheme();
  const { isDark, toggleTheme } = useThemeToggle();
  return (
    <RailScroll>
      {showHome && <GoHomeCard />}
      <RailCard title="Appearance" icon="palette">
        <View style={[styles.toggleRow, { backgroundColor: colors.background }]}>
          <MaterialIcons
            name={isDark ? 'dark-mode' : 'light-mode'}
            size={20}
            color={colors.primary}
          />
          <View style={styles.flex}>
            <Text style={[styles.actionLabel, { color: colors.textDarker }]}>Dark mode</Text>
            <Text style={[styles.actionHint, { color: colors.text }]}>
              {isDark ? 'On' : 'Off'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
      </RailCard>
      <AssistantChatCard />
      <RailFooter />
    </RailScroll>
  );
};

// ---------------------------------------------------------------------------
// Live class: attendance + chat
// ---------------------------------------------------------------------------

export const LiveClassRail = ({
  isHost,
  attendees,
  wavers,
  onAllowSpeak,
  messages,
  inputText,
  setInputText,
  onSend,
  userUid,
}: {
  isHost: boolean;
  attendees: any[];
  wavers: any[];
  onAllowSpeak?: (uid: string) => void;
  messages: any[];
  inputText: string;
  setInputText: (t: string) => void;
  onSend: () => void;
  userUid?: string;
}) => {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const waving = new Set(wavers.map(w => w.uid));
  return (
    <View style={styles.flex}>
      <RailCard
        title={isHost ? 'Attendance' : 'In class'}
        icon="how-to-reg"
        right={
          <View style={[styles.countPill, { backgroundColor: colors.primary + '1A' }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{attendees.length}</Text>
          </View>
        }
      >
        {isHost && (
          <Text style={[styles.actionHint, { color: colors.text, marginBottom: 6 }]}>
            Students picked up in this session so far.
          </Text>
        )}
        <ScrollView style={styles.attendeeList} nestedScrollEnabled>
          {attendees.length === 0 ? (
            <EmptyLine icon="person-search" text="Waiting for students to join…" />
          ) : (
            attendees.map((a, i) => (
              <View key={a.uid || i} style={styles.attendeeRow}>
                <UserAvatar
                  profilePic={a.profilePic}
                  firstName={a.firstname}
                  lastName={a.lastname}
                  username={a.username}
                  style={styles.attendeeAvatar}
                />
                <View style={styles.flex}>
                  <Text style={[styles.attendeeName, { color: colors.textDarker }]} numberOfLines={1}>
                    {[a.firstname, a.lastname].filter(Boolean).join(' ') || a.username || 'Student'}
                  </Text>
                  {!!a.matricNumber && (
                    <Text style={[styles.actionHint, { color: colors.text }]}>{a.matricNumber}</Text>
                  )}
                </View>
                {waving.has(a.uid) &&
                  (isHost && onAllowSpeak ? (
                    <TouchableOpacity
                      style={[styles.allowBtn, { backgroundColor: colors.primary }]}
                      onPress={() => onAllowSpeak(a.uid)}
                    >
                      <MaterialIcons name="waving-hand" size={13} color={colors.btnTextColor} />
                      <Text style={[styles.allowText, { color: colors.btnTextColor }]}>Allow</Text>
                    </TouchableOpacity>
                  ) : (
                    <MaterialIcons name="waving-hand" size={16} color={colors.primary} />
                  ))}
              </View>
            ))
          )}
        </ScrollView>
      </RailCard>

      <View
        style={[
          styles.card,
          styles.chatCard,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border + '40' },
        ]}
      >
        <View style={styles.cardHead}>
          <MaterialIcons name="chat" size={17} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textDarker }]}>Class chat</Text>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <EmptyLine icon="forum" text="No messages yet. Say hello!" />
          ) : (
            messages.map((m, i) => {
              const mine = m.userId === userUid || m.senderId === userUid;
              return (
                <View
                  key={m.id || i}
                  style={[
                    styles.bubble,
                    mine
                      ? [styles.bubbleMine, { backgroundColor: colors.primary }]
                      : [styles.bubbleTheirs, { backgroundColor: colors.background }],
                  ]}
                >
                  {!mine && !!m.username && (
                    <Text style={[styles.bubbleSender, { color: colors.primary }]}>{m.username}</Text>
                  )}
                  <Text style={[styles.bubbleText, { color: mine ? colors.btnTextColor : colors.text }]}>
                    {m.text}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
        <View style={[styles.chatInputRow, { borderColor: colors.border + '80' }]}>
          <TextInput
            style={[styles.chatInput, { color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message the class…"
            placeholderTextColor={colors.inputTextHolder}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={onSend} disabled={!inputText.trim()} accessibilityLabel="Send message">
            <MaterialIcons
              name="send"
              size={20}
              color={inputText.trim() ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Defaults by route (when the screen didn't register its own panel)
// ---------------------------------------------------------------------------

export const DefaultRail = ({ routeName }: { routeName?: string }) => {
  switch (routeName) {
    case 'Settings':
    case 'NotificationSettings':
    case 'LinkedDevicesScreen':
    case 'EmailsScreen':
    case 'PhoneScreen':
    case 'ResetPasswordScreen':
    case 'ChangePasswordScreen':
      return <SettingsRail showHome />;
    case 'CartScreen':
    case 'FavoritesScreen':
    case 'ProductDetails':
    case 'SellerProducts':
      return <StoreRail showHome />;
    // The Notifications screen is the full list already; a single
    // notification gets the latest ones beside it.
    case 'NotificationDetails':
      return <FeedRail showHome />;
    // Home itself registers its own rail, so it never lands here.
    default:
      return <AdsRail showHome />;
  }
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 12, paddingBottom: 24 },
  spinner: { marginVertical: 16 },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { flex: 1, fontSize: 14.5, fontWeight: '800' },
  link: { fontSize: 12.5, fontWeight: '700' },
  cardFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingTop: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13.5, fontWeight: '700' },
  actionHint: { fontSize: 11.5, opacity: 0.75, marginTop: 1 },
  emptyLine: { alignItems: 'center', gap: 6, paddingVertical: 14 },
  emptyText: { fontSize: 12.5, opacity: 0.7, textAlign: 'center' },
  footer: { fontSize: 11, opacity: 0.6, textAlign: 'center' },
  notifRow: { flexDirection: 'row', gap: 8, paddingVertical: 9 },
  notifDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  notifTitle: { fontSize: 13, fontWeight: '700' },
  notifBody: { fontSize: 12, marginTop: 2, lineHeight: 17, opacity: 0.85 },
  notifTime: { fontSize: 11, marginTop: 3, opacity: 0.6 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 10,
  },
  segmentText: { fontSize: 12.5, fontWeight: '700' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  productThumb: { width: 44, height: 44, borderRadius: 10 },
  productName: { fontSize: 13, fontWeight: '700' },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  productQty: { fontSize: 12, fontWeight: '600' },
  lectureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dateBadge: { width: 42, borderRadius: 10, paddingVertical: 5, alignItems: 'center' },
  dateDay: { fontSize: 15, fontWeight: '800' },
  dateMonth: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  lectureTitle: { fontSize: 13, fontWeight: '700' },
  lectureMeta: { fontSize: 11.5, marginTop: 2, opacity: 0.75 },
  livePill: { backgroundColor: '#E53935', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  livePillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  urlText: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  checkText: { fontSize: 13 },
  checkDone: { textDecorationLine: 'line-through', opacity: 0.55 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  chatBox: { height: 300 },
  chatCard: { flex: 1, marginTop: 12, minHeight: 260 },
  chatContent: { gap: 6, paddingVertical: 4 },
  bubble: { maxWidth: '88%', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 },
  bubbleMine: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleSender: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  bubbleText: { fontSize: 13, lineHeight: 18 },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  chatInput: { flex: 1, fontSize: 13.5, paddingVertical: 9 },
  countPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 12, fontWeight: '800' },
  attendeeList: { maxHeight: 260 },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  attendeeAvatar: { width: 32, height: 32, borderRadius: 16 },
  attendeeName: { fontSize: 13, fontWeight: '600' },
  allowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  allowText: { fontSize: 11.5, fontWeight: '700' },
});
