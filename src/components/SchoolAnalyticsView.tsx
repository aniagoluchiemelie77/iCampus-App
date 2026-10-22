import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import { SchoolMetrics } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';

/**
 * Institution analytics for school administrators, gated by the school's plan
 * (OperationalInstitutions.tier): Basic (free) → Professional (pro) →
 * Enterprise (premium). Data for a tier is only computed server-side when the
 * school has it; locked tiers show what upgrading adds.
 */

const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v}%`);
const fmtNum = (v: number | null | undefined) => (v == null ? '—' : Number(v).toLocaleString());

const Section = ({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: string;
  badge?: string;
  children: React.ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={s.sectionHead}>
        <MaterialIcons name={icon} size={18} color={colors.primary} />
        <Text style={[s.sectionTitle, { color: colors.textDarker }]}>{title}</Text>
        {!!badge && (
          <View style={[s.badge, { backgroundColor: colors.primary + '1A' }]}>
            <Text style={[s.badgeText, { color: colors.primary }]}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
};

const Tiles = ({ items }: { items: { label: string; value: string; tone?: string }[] }) => {
  const { colors } = useTheme();
  return (
    <View style={s.tiles}>
      {items.map(item => (
        <View key={item.label} style={[s.tile, { backgroundColor: colors.background }]}>
          <Text style={[s.tileValue, { color: item.tone || colors.textDarker }]}>{item.value}</Text>
          <Text style={[s.tileLabel, { color: colors.text }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

/** Horizontal percentage bar row. */
const BarRow = ({ label, value, sub }: { label: string; value: number | null; sub?: string }) => {
  const { colors } = useTheme();
  const tone =
    value == null ? colors.border : value >= 75 ? colors.success : value >= 50 ? colors.pendingDelivery : colors.primary;
  return (
    <View style={s.barRow}>
      <View style={s.barHead}>
        <Text style={[s.barLabel, { color: colors.textDarker }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[s.barValue, { color: colors.textDarker }]}>{fmtPct(value)}</Text>
      </View>
      <View style={[s.barTrack, { backgroundColor: colors.border + '66' }]}>
        <View style={[s.barFill, { width: `${Math.min(100, value ?? 0)}%`, backgroundColor: tone }]} />
      </View>
      {!!sub && <Text style={[s.barSub, { color: colors.text }]}>{sub}</Text>}
    </View>
  );
};

/** Tiny column chart for weekly series. */
const MiniColumns = ({
  data,
  max,
  color,
}: {
  data: { label: string; value: number | null }[];
  max?: number;
  color: string;
}) => {
  const { colors } = useTheme();
  const top = max ?? Math.max(1, ...data.map(d => d.value ?? 0));
  return (
    <View style={s.columns}>
      {data.map(d => (
        <View key={d.label} style={s.columnWrap}>
          <View style={[s.columnTrack, { backgroundColor: colors.border + '44' }]}>
            <View
              style={[
                s.columnFill,
                { height: `${Math.max(2, ((d.value ?? 0) / top) * 100)}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={[s.columnLabel, { color: colors.text }]}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
};

const LockedCard = ({ label, features }: { label: string; features: string[] }) => {
  const { colors } = useTheme();
  return (
    <View style={[s.card, s.locked, { borderColor: colors.primary + '55', backgroundColor: colors.primary + '0A' }]}>
      <View style={s.sectionHead}>
        <MaterialIcons name="lock" size={18} color={colors.primary} />
        <Text style={[s.sectionTitle, { color: colors.textDarker }]}>{label} analytics</Text>
      </View>
      <Text style={[s.lockedText, { color: colors.text }]}>
        Available on the {label} plan. Upgrading adds:
      </Text>
      {features.map(f => (
        <View key={f} style={s.featureRow}>
          <MaterialIcons name="check" size={15} color={colors.primary} />
          <Text style={[s.featureText, { color: colors.textDarker }]}>{f}</Text>
        </View>
      ))}
      <Text style={[s.lockedText, { color: colors.text, marginTop: 8 }]}>
        Contact the iCampus team to change your institution's plan.
      </Text>
    </View>
  );
};

export const SchoolAnalyticsView = ({ metrics }: { metrics: SchoolMetrics }) => {
  const { colors } = useTheme();
  const basic = metrics.basic;
  const pro = metrics.professional;
  const ent = metrics.enterprise;
  const inst = metrics.institution;
  const lockedFor = (tier: string) => metrics.locked?.find(l => l.tier === tier);
  const weekLabel = (w: string) => moment(w, 'YYYY-MM-DD').format('D/M');

  if (!basic) return null;

  return (
    <View style={s.container}>
      {/* Plan header */}
      <View style={[s.card, s.header, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.schoolName, { color: colors.textDarker }]} numberOfLines={2}>
            {inst?.name || 'Your institution'}
          </Text>
          <Text style={[s.meta, { color: colors.text }]}>
            Updated {metrics.generatedAt ? moment(metrics.generatedAt).fromNow() : 'just now'}
          </Text>
        </View>
        <View style={[s.planPill, { backgroundColor: colors.primary }]}>
          <MaterialIcons name="workspace-premium" size={14} color="#fff" />
          <Text style={s.planText}>{inst?.tierLabel || 'Basic'} plan</Text>
        </View>
      </View>

      {/* ---------------- Basic ---------------- */}
      <Section title="Student identity" icon="badge" badge="Basic">
        <Tiles
          items={[
            { label: 'Students', value: fmtNum(basic.identity.totalStudents) },
            { label: 'Verified students', value: fmtNum(basic.identity.verifiedStudents), tone: colors.success },
            { label: 'Lecturers', value: fmtNum(basic.identity.totalLecturers) },
            { label: 'Verification rate', value: fmtPct(basic.identity.verificationRatePct) },
          ]}
        />
      </Section>

      <Section title="Attendance overview" icon="how-to-reg" badge="Basic">
        <Tiles
          items={[
            { label: 'Attendance rate', value: fmtPct(basic.attendance.attendanceRatePct), tone: colors.primary },
            { label: 'Lectures held', value: fmtNum(basic.attendance.lecturesHeld) },
            { label: 'Check-ins', value: fmtNum(basic.attendance.checkIns) },
            { label: 'Cancelled', value: fmtNum(basic.attendance.lecturesCancelled) },
          ]}
        />
        <Text style={[s.meta, { color: colors.text, marginTop: 8 }]}>
          {basic.attendance.physicalLectures} physical · {basic.attendance.onlineLectures} online lectures held
        </Text>
      </Section>

      <Section title="Courses & announcements" icon="campaign" badge="Basic">
        <Tiles
          items={[
            { label: 'Active courses', value: fmtNum(basic.courses.totalActiveCourses) },
            { label: 'Enrollments', value: fmtNum(basic.courses.studentEnrollments) },
            {
              label: 'Without lecturer',
              value: fmtNum(basic.courses.allocationStatus.unassigned),
              tone: basic.courses.allocationStatus.unassigned > 0 ? colors.pendingDelivery : undefined,
            },
            { label: 'School memos', value: fmtNum(basic.announcements.memosPosted) },
          ]}
        />
        {!!basic.announcements.lastPostedAt && (
          <Text style={[s.meta, { color: colors.text, marginTop: 8 }]}>
            Last memo {moment(basic.announcements.lastPostedAt).fromNow()} ·{' '}
            {fmtNum(basic.announcements.totalImpressions)} views
          </Text>
        )}
        {basic.onboardingGrowth.length > 0 && (
          <>
            <Text style={[s.subTitle, { color: colors.textDarker }]}>Verified sign-ups per month</Text>
            <MiniColumns
              color={colors.success}
              data={basic.onboardingGrowth.map((g: any) => ({
                label: moment(g.month, 'YYYY-MM').format('MMM'),
                value: g.students + g.lecturers,
              }))}
            />
          </>
        )}
      </Section>

      {/* ---------------- Professional ---------------- */}
      {pro ? (
        <>
          <Section title="Tests & exam proctoring" icon="quiz" badge="Professional">
            <Tiles
              items={[
                { label: 'Published tests', value: fmtNum(pro.assessments.published) },
                { label: 'Submissions', value: fmtNum(pro.assessments.submissions) },
                { label: 'Average score', value: fmtPct(pro.assessments.averageScorePct) },
                { label: 'Pass rate (40%+)', value: fmtPct(pro.assessments.passRatePct), tone: colors.success },
              ]}
            />
            <Text style={[s.meta, { color: colors.text, marginTop: 8 }]}>
              {pro.assessments.flaggedSubmissions} flagged for review ·{' '}
              {pro.assessments.impersonationBlocked} impersonation attempts blocked
            </Text>
          </Section>

          <Section title="Attendance by department" icon="apartment" badge="Professional">
            {pro.attendance.byDepartment.length === 0 ? (
              <Text style={[s.meta, { color: colors.text }]}>No lectures held yet.</Text>
            ) : (
              pro.attendance.byDepartment.map((d: any) => (
                <BarRow key={d.department} label={d.department} value={d.attendanceRatePct} />
              ))
            )}
            <Text style={[s.subTitle, { color: colors.textDarker }]}>Weekly attendance (8 weeks)</Text>
            <MiniColumns
              max={100}
              color={colors.primary}
              data={pro.attendance.weeklyTrend.map((w: any) => ({
                label: weekLabel(w.week),
                value: w.attendanceRatePct,
              }))}
            />
            {pro.attendance.lowestCourses.length > 0 && (
              <>
                <Text style={[s.subTitle, { color: colors.textDarker }]}>Courses needing attention</Text>
                {pro.attendance.lowestCourses.map((c: any) => (
                  <BarRow
                    key={c.courseId}
                    label={`${c.courseCode} ${c.courseTitle}`.trim()}
                    value={c.attendanceRatePct}
                    sub={`${c.lecturesHeld} lectures held`}
                  />
                ))}
              </>
            )}
            <Text style={[s.meta, { color: colors.text, marginTop: 8 }]}>
              Exceptions: {pro.attendance.exceptionsApproved} approved · {pro.attendance.exceptionsPending} pending
            </Text>
          </Section>

          <Section title="LMS & lecturer activity" icon="menu-book" badge="Professional">
            <Tiles
              items={[
                { label: 'Syllabus coverage', value: fmtPct(pro.lms.syllabusCoveragePct) },
                { label: 'Materials', value: fmtNum(pro.lms.materialsUploaded) },
                { label: 'Assignments', value: fmtNum(pro.lms.assignmentsPosted) },
              ]}
            />
            {pro.lecturers.length > 0 && (
              <>
                <Text style={[s.subTitle, { color: colors.textDarker }]}>Most active lecturers</Text>
                {pro.lecturers.map((l: any) => (
                  <View key={l.uid} style={[s.listRow, { borderColor: colors.border + '55' }]}>
                    <Text style={[s.listName, { color: colors.textDarker }]} numberOfLines={1}>
                      {l.name}
                    </Text>
                    <Text style={[s.meta, { color: colors.text }]}>
                      {l.lecturesDelivered} lectures · {l.physical} physical · {l.online} online
                    </Text>
                  </View>
                ))}
              </>
            )}
          </Section>
        </>
      ) : (
        lockedFor('pro') && <LockedCard {...lockedFor('pro')!} />
      )}

      {/* ---------------- Enterprise ---------------- */}
      {ent ? (
        <>
          <Section title="At-risk students" icon="report" badge="Enterprise">
            <Text style={[s.meta, { color: colors.text, marginBottom: 8 }]}>
              Below {ent.atRisk.thresholds.attendancePct}% attendance or {ent.atRisk.thresholds.scorePct}% average score
            </Text>
            <Tiles items={[{ label: 'Students at risk', value: fmtNum(ent.atRisk.count), tone: colors.primary }]} />
            {ent.atRisk.students.map((st: any) => (
              <View key={st.uid} style={[s.listRow, { borderColor: colors.border + '55' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.listName, { color: colors.textDarker }]} numberOfLines={1}>
                    {st.name}
                  </Text>
                  <Text style={[s.meta, { color: colors.text }]}>
                    {st.matricNumber} · {st.department}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.meta, { color: colors.text }]}>Attendance {fmtPct(st.attendancePct)}</Text>
                  <Text style={[s.meta, { color: colors.text }]}>Score {fmtPct(st.scorePct)}</Text>
                </View>
              </View>
            ))}
          </Section>

          <Section title="Department comparison" icon="compare-arrows" badge="Enterprise">
            {ent.departments.map((d: any) => (
              <View key={d.department} style={[s.listRow, { borderColor: colors.border + '55' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.listName, { color: colors.textDarker }]}>{d.department}</Text>
                  <Text style={[s.meta, { color: colors.text }]}>{d.students} students</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.meta, { color: colors.text }]}>Attendance {fmtPct(d.averageAttendancePct)}</Text>
                  <Text style={[s.meta, { color: colors.text }]}>Score {fmtPct(d.averageScorePct)}</Text>
                </View>
              </View>
            ))}
          </Section>

          <Section title="12-week engagement" icon="trending-up" badge="Enterprise">
            <Text style={[s.subTitle, { color: colors.textDarker, marginTop: 0 }]}>Attendance check-ins</Text>
            <MiniColumns
              color={colors.primary}
              data={ent.engagementTrend.map((w: any) => ({ label: weekLabel(w.week), value: w.checkIns }))}
            />
            <Text style={[s.subTitle, { color: colors.textDarker }]}>Test submissions</Text>
            <MiniColumns
              color={colors.success}
              data={ent.engagementTrend.map((w: any) => ({ label: weekLabel(w.week), value: w.submissions }))}
            />
          </Section>

          <Section title="Integrity & security" icon="security" badge="Enterprise">
            <Tiles
              items={[
                { label: 'Flagged tests', value: fmtNum(ent.integrity.flaggedSubmissions), tone: colors.primary },
                { label: 'Face mismatches', value: fmtNum(ent.integrity.identityMismatchesInTests) },
                { label: 'Test interruptions', value: fmtNum(ent.integrity.testInterruptions) },
                { label: 'Suspicious accounts', value: fmtNum(ent.integrity.accountsWithSuspiciousActivity) },
              ]}
            />
            {Object.keys(ent.exceptionReasons || {}).length > 0 && (
              <Text style={[s.meta, { color: colors.text, marginTop: 8 }]}>
                Exception reasons:{' '}
                {Object.entries(ent.exceptionReasons)
                  .map(([r, n]) => `${r} ${n}`)
                  .join(' · ')}
              </Text>
            )}
            {!!ent.support?.contactEmail && (
              <Text style={[s.meta, { color: colors.primary, marginTop: 8 }]}>
                Dedicated support: {ent.support.contactEmail}
              </Text>
            )}
          </Section>
        </>
      ) : (
        lockedFor('premium') && <LockedCard {...lockedFor('premium')!} />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { paddingBottom: 30 },
  card: { borderRadius: 18, padding: 14, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  schoolName: { fontSize: 17, fontWeight: '800' },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  planText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10.5, fontWeight: '800' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1, flexBasis: '45%', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  tileValue: { fontSize: 18, fontWeight: '800' },
  tileLabel: { fontSize: 11.5, marginTop: 2, opacity: 0.75 },
  meta: { fontSize: 12, opacity: 0.8 },
  subTitle: { fontSize: 13, fontWeight: '800', marginTop: 14, marginBottom: 8 },
  barRow: { marginBottom: 10 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { flex: 1, fontSize: 13, fontWeight: '600', marginRight: 8 },
  barValue: { fontSize: 13, fontWeight: '800' },
  barTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barSub: { fontSize: 11, marginTop: 3, opacity: 0.7 },
  columns: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 90 },
  columnWrap: { flex: 1, alignItems: 'center' },
  columnTrack: { width: '100%', height: 72, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  columnFill: { width: '100%', borderRadius: 4 },
  columnLabel: { fontSize: 9, marginTop: 4, opacity: 0.7 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listName: { fontSize: 13.5, fontWeight: '700' },
  locked: { borderWidth: 1, borderStyle: 'dashed' },
  lockedText: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  featureText: { fontSize: 13, fontWeight: '600' },
});
