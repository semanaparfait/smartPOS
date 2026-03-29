import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const user = {
    name: "Semana Parfait",
    email: "shemaparfait7@gmail.com",
    phone: "+250 788 000 000",
    role: "Senior Cashier",
    department: "Sales & Operations",
    pin: "••••",
    faceIdEnabled: true,
    workerId: "EMP-2026-001",
    joinedDate: "15 Jan 2026",
    shiftStart: "08:00 AM",
    shiftEnd: "05:00 PM",
    avatar: 'https://i.pinimg.com/736x/a8/62/6b/a8626bcd97a2fa3102647f77e9cd693d.jpg'
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Staff Profile</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Active Shift</Text>
          </View>
        </View>

        <View style={styles.mainLayout}>
          
          {/* LEFT COLUMN: PERSONAL INFO & ACTIONS */}
          <View style={styles.leftColumn}>
            <View style={styles.glassCard}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: user.avatar }} style={styles.profileImage} />
                <TouchableOpacity style={styles.editIcon}>
                  <Ionicons name="camera" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userRole}>{user.role}</Text>

              <View style={styles.divider} />

              <View style={styles.infoList}>
                <InfoItem icon="mail" label="Email Address" value={user.email} />
                <InfoItem icon="call" label="Contact Number" value={user.phone} />
                <InfoItem icon="time" label="Working Shift" value={`${user.shiftStart} - ${user.shiftEnd}`} />
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.actionGroup}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="lock-closed-outline" size={20} color="green" />
                <Text style={styles.actionButtonText}>Change Password</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="keypad-outline" size={20} color="green" />
                <Text style={styles.actionButtonText}>Reset System PIN</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT COLUMN: PROFESSIONAL ID CARD & SECURITY */}
          <View style={styles.rightColumn}>
            
            {/* CLASSIC BUSINESS/STAFF CARD */}
            <View style={styles.businessCard}>
              <View style={styles.cardTopBar}>
                <Text style={styles.cardOrgName}>SMART POS SYSTEMS</Text>
                <Ionicons name="infinite" size={20} color="white" />
              </View>
              
              <View style={styles.cardMain}>
                <Image source={{ uri: user.avatar }} style={styles.cardPhoto} />
                <View style={styles.cardDetails}>
                  <Text style={styles.cardName}>{user.name.toUpperCase()}</Text>
                  <Text style={styles.cardDept}>{user.department}</Text>
                  
                  <View style={styles.cardGrid}>
                    <View>
                      <Text style={styles.cardSmallLabel}>EMPLOYEE ID</Text>
                      <Text style={styles.cardSmallValue}>{user.workerId}</Text>
                    </View>
                    <View>
                      <Text style={styles.cardSmallLabel}>JOINED</Text>
                      <Text style={styles.cardSmallValue}>{user.joinedDate}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.qrContainer}>
                    <Ionicons name="qr-code" size={45} color="#1F2937" />
                </View>
              </View>
              <View style={styles.cardFooterBar} />
            </View>

            {/* SECURITY SETTINGS */}
            <View style={styles.securitySection}>
              <Text style={styles.sectionTitle}>Security Settings</Text>
              
              <SecurityRow 
                icon="finger-print" 
                label="Biometric Login" 
                value={user.faceIdEnabled ? "Active" : "Inactive"} 
                isStatus 
              />
              <SecurityRow 
                icon="shield-checkmark" 
                label="Account Status" 
                value="Verified" 
                isStatus 
              />
              <SecurityRow 
                icon="phone-portrait" 
                label="Linked Device" 
                value="POS Tablet-04" 
              />
            </View>
          </View>

        </View>
      </View>
    </ScrollView>
  );
}

const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={18} color="green" />
    </View>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const SecurityRow = ({ icon, label, value, isStatus }) => (
  <View style={styles.securityRow}>
    <View style={styles.securityInfo}>
      <Ionicons name={icon} size={20} color="#4B5563" />
      <Text style={styles.securityLabel}>{label}</Text>
    </View>
    <Text style={[styles.securityValue, isStatus && { color: 'green', fontWeight: 'bold' }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  contentContainer: { padding: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#111827' },
  badge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#065F46', fontSize: 12, fontWeight: 'bold' },
  
  mainLayout: { flexDirection: 'row', gap: 24 },
  
  // Left Side
  leftColumn: { flex: 1 },
  glassCard: { backgroundColor: '#fff', padding: 24, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  imageContainer: { marginBottom: 16 },
  profileImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#F3F4F6' },
  editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'green', padding: 8, borderRadius: 20, borderSize: 3, borderColor: '#fff' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  userRole: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F3F4F6', width: '100%', marginVertical: 20 },
  infoList: { width: '100%', gap: 20 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FFF0', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: '#374151', fontWeight: '500' },

  actionGroup: { marginTop: 20, gap: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, gap: 12, borderSize: 1, borderColor: '#E5E7EB' },
  actionButtonText: { fontSize: 15, fontWeight: '600', color: '#374151' },

  // Right Side
  rightColumn: { flex: 1.4, gap: 24 },
  businessCard: { backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 10, overflow: 'hidden' },
  cardTopBar: { backgroundColor: '#1F2937', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardOrgName: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  cardMain: { padding: 24, flexDirection: 'row', alignItems: 'center' },
  cardPhoto: { width: 90, height: 110, borderRadius: 8, backgroundColor: '#F3F4F6' },
  cardDetails: { flex: 1, marginLeft: 20 },
  cardName: { fontSize: 20, fontWeight: '900', color: '#111827' },
  cardDept: { fontSize: 14, color: 'green', fontWeight: 'bold', marginBottom: 12 },
  cardGrid: { flexDirection: 'row', gap: 24 },
  cardSmallLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: 'bold' },
  cardSmallValue: { fontSize: 13, color: '#1F2937', fontWeight: '700' },
  qrContainer: { padding: 8, borderSize: 1, borderColor: '#F3F4F6', borderRadius: 12 },
  cardFooterBar: { height: 8, backgroundColor: 'green' },

  securitySection: { backgroundColor: '#fff', padding: 24, borderRadius: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  securityRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  securityInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  securityLabel: { fontSize: 15, color: '#4B5563' },
  securityValue: { fontSize: 15, color: '#1F2937', fontWeight: '500' }
});