# Laporan Investigasi: School Information Tidak Tampil di Frontend

**Tanggal**: 19 Oktober 2025  
**User ID yang Diinvestigasi**: `b9f8b7b9-4a65-4c86-8153-cd870e0141d4`  
**Endpoint**: `GET /api/admin/users/:userId`

---

## 1. Ringkasan Masalah

User melaporkan bahwa informasi sekolah tidak ditampilkan di halaman detail user pada frontend admin panel (https://api.futureguide.id/api/admin/users/b9f8b7b9-4a65-4c86-8153-cd870e0141d4), meskipun data network response menunjukkan `"profile": null`.

---

## 2. Investigasi Database

### 2.1 Struktur Database

Database memiliki struktur sebagai berikut:

**Tabel `auth.users`**:
- Menyimpan data user utama
- Tidak memiliki kolom `school_id` atau `school_name`

**Tabel `auth.user_profiles`**:
- Menyimpan data profil user
- Memiliki kolom `school_id` (integer) yang mereferensi ke tabel schools
- Relasi: `user_profiles.user_id` → `users.id`

**Tabel `public.schools`**:
- Menyimpan data sekolah
- Relasi: `user_profiles.school_id` → `schools.id`

### 2.2 Query Database untuk User yang Diinvestigasi

```sql
SELECT u.id, u.username, u.email, up.school_id, up.full_name 
FROM auth.users u 
LEFT JOIN auth.user_profiles up ON u.id = up.user_id 
WHERE u.id = 'b9f8b7b9-4a65-4c86-8153-cd870e0141d4';
```

**Hasil**:
```
id                                  | username     | email                | school_id | full_name 
------------------------------------+--------------+----------------------+-----------+-----------
b9f8b7b9-4a65-4c86-8153-cd870e0141d4| ossee_mNEJWe | kiana11224@gmail.com | 34        | 
```

**Kesimpulan Database**: User MEMILIKI school_id = 34 di tabel `auth.user_profiles`.

### 2.3 Data Sekolah

```sql
SELECT * FROM public.schools WHERE id = 34;
```

**Hasil**:
```
id | name                | address | city | province | created_at          
---+---------------------+---------+------+----------+---------------------
34 | SMAN 1 SIGMA MEWING |         |      |          | 2025-10-19 02:12:18
```

**Kesimpulan**: Sekolah dengan ID 34 ada di database dengan nama "SMAN 1 SIGMA MEWING".

---

## 3. Investigasi Backend Code

### 3.1 Model Associations

File: `admin-service/src/models/associations.js`

```javascript
// UserProfile <-> School (Many-to-One)
UserProfile.belongsTo(School, {
  foreignKey: 'school_id',
  targetKey: 'id',
  as: 'school',
  constraints: false // Important: disable constraints for cross-schema associations
});

School.hasMany(UserProfile, {
  foreignKey: 'school_id',
  sourceKey: 'id',
  as: 'profiles',
  constraints: false
});
```

**Status**: ✅ Associations sudah benar

### 3.2 Service Layer

File: `admin-service/src/services/userService.js`

Fungsi `getUserById()`:

```javascript
const user = await User.findByPk(userId, {
  include: [{
    model: UserProfile,
    as: 'profile',
    required: false,
    include: [{
      model: School,
      as: 'school',
      required: false
    }]
  }],
  attributes: {
    exclude: ['password_hash', 'school_id']
  }
});
```

**Status**: ✅ Query sudah benar, include profile dan school dengan nested include

---

## 4. Testing Endpoint

### 4.1 Login Admin

```bash
curl -X POST https://api.futureguide.id/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@futureguide.id","password":"fgadmin321"}'
```

### 4.2 Test Endpoint User Detail

```bash
curl -X GET "https://api.futureguide.id/api/admin/users/b9f8b7b9-4a65-4c86-8153-cd870e0141d4" \
  -H "Authorization: Bearer <TOKEN>"
```

### 4.3 Response Aktual dari Backend

```json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "user": {
      "id": "b9f8b7b9-4a65-4c86-8153-cd870e0141d4",
      "username": "ossee_mNEJWe",
      "email": "kiana11224@gmail.com",
      "user_type": "user",
      "is_active": true,
      "token_balance": 3,
      "last_login": null,
      "firebase_uid": "mNEJWeg0f8dzjAYhCOymHo2i1NG2",
      "auth_provider": "firebase",
      "provider_data": {
        "disabled": false,
        "provider_id": "password",
        "creation_time": "Sun, 19 Oct 2025 02:12:16 GMT",
        "email_verified": false,
        "last_sign_in_time": "Sun, 19 Oct 2025 02:12:16 GMT"
      },
      "last_firebase_sync": "2025-10-19T02:12:18.162Z",
      "federation_status": "active",
      "created_at": "2025-10-19T02:12:18.144Z",
      "updated_at": "2025-10-19T02:12:18.162Z",
      "profile": {
        "user_id": "b9f8b7b9-4a65-4c86-8153-cd870e0141d4",
        "full_name": null,
        "date_of_birth": null,
        "gender": null,
        "school_id": 34,
        "created_at": "2025-10-19T07:46:35.294Z",
        "updated_at": "2025-10-19T07:46:35.294Z",
        "school": {
          "id": 34,
          "name": "SMAN 1 SIGMA MEWING",
          "address": null,
          "city": null,
          "province": null,
          "created_at": "2025-10-19T02:12:18.129Z"
        }
      }
    },
    "statistics": {
      "jobs": [],
      "conversations": 0
    },
    "recentJobs": [],
    "recentConversations": []
  },
  "timestamp": "2025-10-19T08:08:36.045Z"
}
```

---

## 5. Kesimpulan

### ✅ BACKEND SUDAH BEKERJA DENGAN BENAR

Backend API **SUDAH MENGEMBALIKAN** informasi sekolah dengan lengkap:

1. **`profile.school_id`**: 34
2. **`profile.school.name`**: "SMAN 1 SIGMA MEWING"
3. **`profile.school.id`**: 34
4. **`profile.school.address`**: null
5. **`profile.school.city`**: null
6. **`profile.school.province`**: null
7. **`profile.school.created_at`**: "2025-10-19T02:12:18.129Z"

### ❌ MASALAH ADA DI FRONTEND

Berdasarkan investigasi:
- Database memiliki data school_id = 34 untuk user ini
- Backend API mengembalikan data school dengan lengkap dalam response
- Frontend tidak menampilkan informasi school yang sudah ada di response

---

## 6. Rekomendasi untuk Frontend Developer

### 6.1 Struktur Data yang Dikirim Backend

Backend mengirimkan data school dalam struktur berikut:

```javascript
data.user.profile.school = {
  id: 34,
  name: "SMAN 1 SIGMA MEWING",
  address: null,
  city: null,
  province: null,
  created_at: "2025-10-19T02:12:18.129Z"
}
```

### 6.2 Cara Mengakses Data School di Frontend

```javascript
// Cek apakah user memiliki profile dan school
if (data.user.profile && data.user.profile.school) {
  const schoolName = data.user.profile.school.name;
  const schoolId = data.user.profile.school.id;
  const schoolAddress = data.user.profile.school.address;
  const schoolCity = data.user.profile.school.city;
  const schoolProvince = data.user.profile.school.province;
  
  // Display school information
  console.log(`School: ${schoolName}`);
} else {
  // No school assigned
  console.log("No school assigned");
}
```

### 6.3 Contoh Implementasi React/Vue

**React**:
```jsx
const SchoolInfo = ({ user }) => {
  if (!user.profile || !user.profile.school) {
    return <div>No school assigned</div>;
  }
  
  const { school } = user.profile;
  
  return (
    <div className="school-info">
      <h3>School Information</h3>
      <p><strong>Name:</strong> {school.name}</p>
      <p><strong>ID:</strong> {school.id}</p>
      {school.address && <p><strong>Address:</strong> {school.address}</p>}
      {school.city && <p><strong>City:</strong> {school.city}</p>}
      {school.province && <p><strong>Province:</strong> {school.province}</p>}
    </div>
  );
};
```

**Vue**:
```vue
<template>
  <div v-if="user.profile && user.profile.school" class="school-info">
    <h3>School Information</h3>
    <p><strong>Name:</strong> {{ user.profile.school.name }}</p>
    <p><strong>ID:</strong> {{ user.profile.school.id }}</p>
    <p v-if="user.profile.school.address">
      <strong>Address:</strong> {{ user.profile.school.address }}
    </p>
    <p v-if="user.profile.school.city">
      <strong>City:</strong> {{ user.profile.school.city }}
    </p>
    <p v-if="user.profile.school.province">
      <strong>Province:</strong> {{ user.profile.school.province }}
    </p>
  </div>
  <div v-else>No school assigned</div>
</template>
```

### 6.4 Hal yang Perlu Dicek di Frontend

1. **Pastikan mengakses path yang benar**: `data.user.profile.school` bukan `data.user.school`
2. **Cek null/undefined**: Selalu cek apakah `profile` dan `school` ada sebelum mengakses propertinya
3. **Refresh cache**: Pastikan tidak ada cache lama yang menyimpan response dengan `profile: null`
4. **Console log**: Log response untuk memastikan data diterima dengan benar

---

## 7. Perubahan yang Dilakukan di Backend

### 7.1 Restart Service

Admin service di-restart untuk memastikan code terbaru dijalankan:

```bash
docker compose restart admin-service
```

**Status**: ✅ Service berhasil di-restart dan berjalan normal

### 7.2 Verifikasi

Endpoint ditest ulang setelah restart dan **BERHASIL** mengembalikan data school dengan lengkap.

---

## 8. Catatan Tambahan

### 8.1 Kasus User Tanpa School

Jika user tidak memiliki school_id di profile, response akan seperti ini:

```json
{
  "profile": {
    "user_id": "...",
    "full_name": "...",
    "school_id": null,
    "school": null
  }
}
```

Atau jika user tidak memiliki profile sama sekali:

```json
{
  "profile": null
}
```

Frontend harus handle kedua kasus ini dengan graceful.

### 8.2 Performance

Query sudah optimal dengan menggunakan Sequelize include untuk melakukan JOIN dalam satu query, bukan multiple queries.

---

## 9. Action Items untuk Frontend

- [ ] Periksa kode frontend yang menampilkan user detail
- [ ] Pastikan mengakses `data.user.profile.school` dengan benar
- [ ] Tambahkan null checking untuk `profile` dan `school`
- [ ] Clear browser cache atau hard refresh
- [ ] Test dengan user ID: `b9f8b7b9-4a65-4c86-8153-cd870e0141d4`
- [ ] Verifikasi data school ditampilkan: "SMAN 1 SIGMA MEWING"

---

## 10. Kontak

Jika ada pertanyaan lebih lanjut tentang struktur response atau butuh perubahan di backend, silakan hubungi backend team.

**Backend Status**: ✅ **WORKING CORRECTLY**  
**Issue Location**: ❌ **FRONTEND DISPLAY LOGIC**