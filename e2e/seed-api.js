const baseUrl = 'http://localhost:8080/api';

async function parseJson(res, name) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} failed: ${res.status} ${text}`);
  try {
    const json = JSON.parse(text);
    return json.data;
  } catch (e) {
    console.log(`${name} returned non-JSON:`, text);
    return null;
  }
}

async function seed() {
  console.log('Seeding data via API...');
  
  // 1. Login
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@gmail.com', password: '123456' })
  });
  if (!loginRes.ok) throw new Error('Login failed: ' + await loginRes.text());
  const loginData = await parseJson(loginRes, 'Login');
  const token = loginData.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Create Property
  const propRes = await fetch(`${baseUrl}/properties`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Nhà trọ Test E2E', address: '123 Đường Test', description: 'Tạo từ Seed Script' })
  });
  const property = await parseJson(propRes, 'Create Property');
  const propertyId = property?.id;
  console.log('Created property:', propertyId);

  // 3. Create Service Price
  const sRes = await fetch(`${baseUrl}/properties/${propertyId}/service-prices`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ electricityPrice: 3500, waterPrice: 20000, wifiFee: 100000, garbageFee: 50000, parkingFee: 0 })
  });
  console.log('Service Price API status:', sRes.status);

  // 4. Create Room
  const roomRes = await fetch(`${baseUrl}/properties/${propertyId}/rooms`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ roomNumber: '101', floor: 1, area: 25, baseRent: 3000000, maxTenants: 2, status: 'AVAILABLE' })
  });
  const room = await parseJson(roomRes, 'Create Room');
  const roomId = room?.id;
  console.log('Created room:', roomId);

  // 5. Create Tenant
  const tenantRes = await fetch(`${baseUrl}/tenants`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fullName: 'Nguyễn Văn Test', phone: '0987654321', email: 'test@gmail.com', status: 'ACTIVE', currentRoomId: roomId })
  });
  const tenant = await parseJson(tenantRes, 'Create Tenant');
  const tenantId = tenant?.id;
  console.log('Created tenant:', tenantId);

  // 6. Create Contract
  const start = new Date();
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);
  const contractRes = await fetch(`${baseUrl}/contracts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      roomId: roomId,
      tenantIds: [tenantId],
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      monthlyRent: 3000000,
      deposit: 3000000,
      paymentDueDay: 5
    })
  });
  const contract = await parseJson(contractRes, 'Create Contract');
  console.log('Created contract:', contract?.id);

  // 7. Create Meter Reading (Last month)
  const date = new Date();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  const meterRes = await fetch(`${baseUrl}/meter-readings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      roomId: roomId,
      month: month,
      year: year,
      electricityOld: 100,
      electricityNew: 200,
      waterOld: 50,
      waterNew: 65
    })
  });
  const meter = await parseJson(meterRes, 'Create Meter');
  console.log('Created meter reading:', meter?.id);

  // 8. Generate Invoice
  const invoiceRes = await fetch(`${baseUrl}/invoices/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      roomId: roomId,
      month: month,
      year: year,
      otherFees: 0,
      discountAmount: 0,
      note: 'Hóa đơn mẫu'
    })
  });
  const invoice = await parseJson(invoiceRes, 'Generate Invoice');
  console.log('Created invoice:', invoice?.id);

  console.log('Seed completed successfully!');
}

seed().catch(console.error);
