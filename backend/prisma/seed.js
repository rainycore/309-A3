'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// All seeded accounts use password: 123123
// NOTE: password validation is bypassed for seeding
const PASSWORD_HASH = bcrypt.hashSync('123123', 10);

async function main() {
  console.log('Seeding database...');

  // ─── Position Types ───────────────────────────────────────────────
  const positionTypes = await Promise.all([
    prisma.positionType.create({ data: { name: 'Event Staff', description: 'Staff for events, conferences, and venues. Duties include guest registration, crowd management, and hospitality.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'Warehouse Associate', description: 'Picking, packing, receiving and shipping in warehouse environments.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'Catering Server', description: 'Serving food and beverages at catered events, banquets, and corporate functions.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'Security Guard', description: 'On-site security monitoring, access control, and incident response.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'Office Receptionist', description: 'Front desk duties including phone answering, visitor management, and scheduling.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'General Labourer', description: 'General construction and site maintenance tasks.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'Customer Service Rep', description: 'Handling customer inquiries via phone, email, and in-person.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'Data Entry Clerk', description: 'Accurate entry and management of data in computer systems.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'Delivery Driver', description: 'Local parcel and document delivery. Valid G license required.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'Retail Associate', description: 'Customer-facing sales and stocking in retail environments.', hidden: false } }),
    prisma.positionType.create({ data: { name: 'Forklift Operator', description: 'Operating forklifts in warehouses. Valid forklift certification required.', hidden: true } }),
    prisma.positionType.create({ data: { name: 'Cleaning Technician', description: 'Commercial and residential cleaning services.', hidden: false } }),
  ]);

  console.log(`Created ${positionTypes.length} position types`);

  // ─── Admin ────────────────────────────────────────────────────────
  await prisma.account.create({
    data: {
      email: 'admin1@csc309.utoronto.ca',
      password: PASSWORD_HASH,
      role: 'admin',
      activated: true,
      admin: {
        create: { utorid: 'admin001' },
      },
    },
  });

  // ─── Businesses ───────────────────────────────────────────────────
  const bizData = [
    { name: 'Toronto Events Co.', owner: 'Michael Chen', phone: '416-555-0101', address: '100 King St W, Toronto, ON', lon: -79.3832, lat: 43.6481, bio: 'Premier event staffing company serving the GTA for over 15 years.', verified: true },
    { name: 'Maple Logistics', owner: 'Sarah Johnson', phone: '416-555-0102', address: '2200 Eglinton Ave E, Toronto, ON', lon: -79.2759, lat: 43.7060, bio: 'Full-service warehousing and distribution across Ontario.', verified: true },
    { name: 'GTA Catering Group', owner: 'David Park', phone: '647-555-0103', address: '55 Adelaide St E, Toronto, ON', lon: -79.3769, lat: 43.6497, bio: 'Award-winning catering for corporate events and weddings.', verified: true },
    { name: 'SecureForce Inc.', owner: 'Lisa Williams', phone: '905-555-0104', address: '350 Burnhamthorpe Rd W, Mississauga, ON', lon: -79.6441, lat: 43.5890, bio: 'Licensed security services for corporate, retail, and event sectors.', verified: true },
    { name: 'Pinnacle Staffing', owner: 'James Rodriguez', phone: '416-555-0105', address: '20 Bay St, Toronto, ON', lon: -79.3774, lat: 43.6426, bio: 'Connecting businesses with top temporary talent since 2010.', verified: true },
    { name: 'North York Office Solutions', owner: 'Emily Zhang', phone: '416-555-0106', address: '5075 Yonge St, Toronto, ON', lon: -79.4148, lat: 43.7684, bio: 'Administrative and office support staffing specialists.', verified: true },
    { name: 'Brick & Mortar Construction', owner: 'Robert Thompson', phone: '905-555-0107', address: '1200 Markham Rd, Toronto, ON', lon: -79.2342, lat: 43.7756, bio: 'Residential and commercial construction contractor.', verified: false },
    { name: 'Lakeside Retail Group', owner: 'Jennifer Lee', phone: '416-555-0108', address: '1 Dundas St W, Toronto, ON', lon: -79.3873, lat: 43.6553, bio: 'Multi-location retail operator across the GTA.', verified: true },
    { name: 'Metro Delivery Services', owner: 'Chris Patel', phone: '647-555-0109', address: '800 Warden Ave, Toronto, ON', lon: -79.2999, lat: 43.7182, bio: 'Same-day and next-day delivery solutions for businesses.', verified: true },
    { name: 'CleanPro Commercial', owner: 'Amanda Nguyen', phone: '416-555-0110', address: '3500 Dufferin St, Toronto, ON', lon: -79.4522, lat: 43.7024, bio: 'Commercial cleaning and facility maintenance services.', verified: false },
  ];

  const businesses = [];
  for (let i = 0; i < bizData.length; i++) {
    const b = bizData[i];
    const acct = await prisma.account.create({
      data: {
        email: `business${i + 1}@csc309.utoronto.ca`,
        password: PASSWORD_HASH,
        role: 'business',
        activated: true,
        business: {
          create: {
            business_name: b.name,
            owner_name: b.owner,
            phone_number: b.phone,
            postal_address: b.address,
            location_lon: b.lon,
            location_lat: b.lat,
            biography: b.bio,
            verified: b.verified,
          },
        },
      },
      include: { business: true },
    });
    businesses.push(acct.business);
  }
  console.log(`Created ${businesses.length} businesses`);

  // ─── Regular Users ────────────────────────────────────────────────
  const userData = [
    { first: 'Alex', last: 'Brown', phone: '416-555-1001', address: '25 College St, Toronto, ON', birthday: '1995-03-15', bio: 'Energetic event worker with 3 years of experience in hospitality.', available: true },
    { first: 'Brenda', last: 'Kim', phone: '647-555-1002', address: '120 Bloor St W, Toronto, ON', birthday: '1998-07-22', bio: 'Reliable and punctual worker available for warehouse and general labour.', available: true },
    { first: 'Carlos', last: 'Martinez', phone: '416-555-1003', address: '450 Spadina Ave, Toronto, ON', birthday: '1993-11-08', bio: 'Former restaurant manager with extensive catering experience.', available: true },
    { first: 'Diana', last: 'Nguyen', phone: '905-555-1004', address: '890 Sheppard Ave W, Toronto, ON', birthday: '1996-05-30', bio: 'Professional security guard with 5 years of experience.', available: false },
    { first: 'Edward', last: 'Wilson', phone: '416-555-1005', address: '1200 Bloor St E, Toronto, ON', birthday: '1994-09-12', bio: 'Office professional skilled in reception and customer service.', available: true },
    { first: 'Fatima', last: 'Al-Hassan', phone: '647-555-1006', address: '340 Queen St W, Toronto, ON', birthday: '1999-01-25', bio: 'Detail-oriented data entry specialist with 60+ WPM typing speed.', available: true },
    { first: 'George', last: 'Taylor', phone: '416-555-1007', address: '780 Danforth Ave, Toronto, ON', birthday: '1991-06-18', bio: 'Experienced delivery driver with clean driving record.', available: true },
    { first: 'Hannah', last: 'Singh', phone: '416-555-1008', address: '567 Lawrence Ave W, Toronto, ON', birthday: '1997-12-03', bio: 'Retail associate with 4 years in customer-facing roles.', available: true },
    { first: 'Ivan', last: 'Petrov', phone: '647-555-1009', address: '2300 Finch Ave W, Toronto, ON', birthday: '1992-04-27', bio: 'Certified forklift operator with warehouse management experience.', available: false },
    { first: 'Julia', last: 'Thompson', phone: '416-555-1010', address: '44 Parliament St, Toronto, ON', birthday: '1998-08-14', bio: 'Passionate about event hospitality and guest experiences.', available: true },
    { first: 'Kevin', last: 'Liu', phone: '905-555-1011', address: '1500 Kingston Rd, Toronto, ON', birthday: '1995-02-09', bio: 'General labourer with construction and landscaping background.', available: true },
    { first: 'Laura', last: 'O\'Brien', phone: '416-555-1012', address: '88 Roncesvalles Ave, Toronto, ON', birthday: '1993-10-21', bio: 'Experienced receptionist and administrative assistant.', available: true },
    { first: 'Marcus', last: 'Johnson', phone: '647-555-1013', address: '670 Ossington Ave, Toronto, ON', birthday: '1996-07-05', bio: 'Security professional with first aid certification.', available: true },
    { first: 'Nina', last: 'Kowalski', phone: '416-555-1014', address: '1080 Bathurst St, Toronto, ON', birthday: '2000-03-18', bio: 'Customer service enthusiast with retail and call centre experience.', available: false },
    { first: 'Oscar', last: 'Reyes', phone: '416-555-1015', address: '520 Runnymede Rd, Toronto, ON', birthday: '1994-11-30', bio: 'Versatile temp worker available for warehouse and cleaning roles.', available: true },
    { first: 'Priya', last: 'Sharma', phone: '647-555-1016', address: '2100 Dufferin St, Toronto, ON', birthday: '1997-05-12', bio: 'Catering server with fine dining and banquet experience.', available: true },
    { first: 'Quinn', last: 'Murphy', phone: '416-555-1017', address: '390 Wilson Ave, Toronto, ON', birthday: '1995-09-07', bio: 'Data entry specialist skilled in Excel and database management.', available: true },
    { first: 'Rachel', last: 'Davis', phone: '905-555-1018', address: '700 Weston Rd, Toronto, ON', birthday: '1992-01-23', bio: 'Retail supervisor with multi-store management experience.', available: true },
    { first: 'Samuel', last: 'Chen', phone: '416-555-1019', address: '150 Gerrard St E, Toronto, ON', birthday: '1998-06-16', bio: 'Energetic warehouse associate available for day and evening shifts.', available: false },
    { first: 'Tanya', last: 'White', phone: '647-555-1020', address: '860 Broadview Ave, Toronto, ON', birthday: '1996-04-02', bio: 'Event staff veteran with experience at major Toronto venues.', available: true },
  ];

  const regularUsers = [];
  for (let i = 0; i < userData.length; i++) {
    const u = userData[i];
    const acct = await prisma.account.create({
      data: {
        email: `regular${i + 1}@csc309.utoronto.ca`,
        password: PASSWORD_HASH,
        role: 'regular',
        activated: true,
        regularUser: {
          create: {
            first_name: u.first,
            last_name: u.last,
            phone_number: u.phone,
            postal_address: u.address,
            birthday: u.birthday,
            biography: u.bio,
            available: u.available,
            lastActiveAt: new Date(),
          },
        },
      },
      include: { regularUser: true },
    });
    regularUsers.push(acct.regularUser);
  }
  console.log(`Created ${regularUsers.length} regular users`);

  // ─── Qualifications ───────────────────────────────────────────────
  // Map position type by index: 0=Event, 1=Warehouse, 2=Catering, 3=Security, 4=Office, 5=Labour, 6=CustSvc, 7=DataEntry, 8=Driver, 9=Retail, 10=Forklift, 11=Cleaning
  const qualAssignments = [
    // [userId_index, posTypeIndex, status, note]
    [0, 0, 'approved', 'Completed 20+ events at major Toronto venues'],
    [0, 2, 'approved', 'Trained in formal service and wine presentation'],
    [1, 1, 'approved', '2 years at Maple Logistics warehouse'],
    [1, 5, 'approved', 'General construction experience'],
    [2, 2, 'approved', 'Former catering supervisor'],
    [2, 6, 'approved', 'Customer service management background'],
    [3, 3, 'approved', 'Ontario licensed security guard'],
    [4, 4, 'approved', 'Receptionist at law firm for 3 years'],
    [4, 6, 'approved', 'Professional customer service certification'],
    [5, 7, 'approved', '65 WPM, proficient in Microsoft Office'],
    [6, 8, 'approved', 'Clean G license, 5 years delivery experience'],
    [7, 9, 'approved', 'Retail supervisor certification'],
    [7, 6, 'approved', 'Customer service training completed'],
    [8, 10, 'approved', 'Valid forklift certification, expires 2027'],
    [8, 1, 'approved', 'Warehouse safety certified'],
    [9, 0, 'approved', 'Event coordination and hospitality diploma'],
    [10, 5, 'approved', 'Construction site safety training'],
    [10, 1, 'approved', 'Warehouse operations background'],
    [11, 4, 'approved', 'Office administration certificate'],
    [11, 7, 'approved', 'Data management experience'],
    [12, 3, 'approved', 'Security guard license, first aid certified'],
    [13, 6, 'approved', 'Call centre experience'],
    [13, 9, 'approved', 'Retail floor experience'],
    [14, 5, 'approved', 'General labour, cleaning certified'],
    [14, 11, 'approved', 'Commercial cleaning experience'],
    [15, 2, 'approved', 'Fine dining and banquet service experience'],
    [15, 0, 'approved', 'Event staff with 4 years experience'],
    [16, 7, 'approved', 'Database management and Excel expert'],
    [17, 9, 'approved', 'Multi-store retail experience'],
    [17, 6, 'approved', 'Customer service lead'],
    [18, 1, 'submitted', 'Looking to get into warehouse work'],
    [18, 5, 'created', ''],
    [19, 0, 'approved', 'Event staff at major Toronto music festivals'],
    [19, 2, 'approved', 'Catering and hospitality experience'],
    // Some pending ones for admin to review
    [0, 3, 'submitted', 'Attended security awareness training'],
    [1, 6, 'revised', 'Updated with new customer service cert'],
    [2, 9, 'submitted', 'Retail experience from summer job'],
    [3, 0, 'submitted', 'Event experience from volunteer work'],
    [4, 8, 'rejected', 'License verification failed'],
    [5, 9, 'submitted', 'Retail experience 6 months'],
  ];

  const qualifications = [];
  for (const [uIdx, ptIdx, status, note] of qualAssignments) {
    try {
      const qual = await prisma.qualification.create({
        data: {
          userId: regularUsers[uIdx].id,
          positionTypeId: positionTypes[ptIdx].id,
          status,
          note,
        },
      });
      qualifications.push(qual);
    } catch (e) {
      // skip duplicates
    }
  }
  console.log(`Created ${qualifications.length} qualifications`);

  // ─── Jobs ─────────────────────────────────────────────────────────
  const now = new Date();
  const h = (hours) => new Date(now.getTime() + hours * 3600000);
  const d = (days) => new Date(now.getTime() + days * 86400000);
  const past = (hours) => new Date(now.getTime() - hours * 3600000);

  const jobData = [
    // Open jobs (future start times within 1 week, with negotiation window)
    { bizIdx: 0, ptIdx: 0, sMin: 18, sMax: 22, start: h(3), end: h(11), note: 'Corporate gala at Metro Convention Centre. Smart casual attire required.', status: 'open' },
    { bizIdx: 0, ptIdx: 2, sMin: 20, sMax: 25, start: h(5), end: h(13), note: 'Wedding reception service for 200 guests.', status: 'open' },
    { bizIdx: 1, ptIdx: 1, sMin: 17, sMax: 20, start: h(4), end: h(12), note: 'Overnight receiving shift. Steel-toe boots required.', status: 'open' },
    { bizIdx: 1, ptIdx: 5, sMin: 19, sMax: 23, start: h(6), end: h(14), note: 'Loading dock work. Physical fitness required.', status: 'open' },
    { bizIdx: 2, ptIdx: 2, sMin: 22, sMax: 28, start: h(8), end: h(16), note: 'Upscale corporate luncheon. Fine dining experience preferred.', status: 'open' },
    { bizIdx: 3, ptIdx: 3, sMin: 21, sMax: 25, start: h(2.5), end: h(10), note: 'Retail security at Eaton Centre location.', status: 'open' },
    { bizIdx: 4, ptIdx: 4, sMin: 19, sMax: 22, start: h(5), end: h(13), note: 'Temp reception coverage. Friendly and professional.', status: 'open' },
    { bizIdx: 5, ptIdx: 4, sMin: 18, sMax: 21, start: h(7), end: h(15), note: 'Office admin support during busy season.', status: 'open' },
    { bizIdx: 5, ptIdx: 7, sMin: 17, sMax: 20, start: h(10), end: h(18), note: 'Data entry from paper forms. Accuracy essential.', status: 'open' },
    { bizIdx: 7, ptIdx: 9, sMin: 16, sMax: 20, start: h(4), end: h(12), note: 'Holiday retail support. Customer service focus.', status: 'open' },
    { bizIdx: 8, ptIdx: 8, sMin: 20, sMax: 24, start: h(6), end: h(14), note: 'Local parcel delivery. Clean G license required.', status: 'open' },
    { bizIdx: 9, ptIdx: 11, sMin: 18, sMax: 22, start: h(5), end: h(9), note: 'Office tower cleaning. Early morning shift.', status: 'open' },
    { bizIdx: 0, ptIdx: 0, sMin: 19, sMax: 23, start: d(2), end: new Date(d(2).getTime() + 8*3600000), note: 'Music festival staff. Outdoor event, weather appropriate clothing.', status: 'open' },
    { bizIdx: 2, ptIdx: 2, sMin: 24, sMax: 30, start: d(3), end: new Date(d(3).getTime() + 6*3600000), note: 'VIP cocktail reception. Must have serving experience.', status: 'open' },
    { bizIdx: 1, ptIdx: 1, sMin: 16, sMax: 19, start: d(4), end: new Date(d(4).getTime() + 8*3600000), note: 'Inventory count shift. Attention to detail required.', status: 'open' },
    { bizIdx: 3, ptIdx: 3, sMin: 22, sMax: 26, start: d(5), end: new Date(d(5).getTime() + 12*3600000), note: 'Concert venue security. Evenings and weekends.', status: 'open' },
    // Filled (completed) jobs
    { bizIdx: 0, ptIdx: 0, sMin: 18, sMax: 22, start: past(48), end: past(40), note: 'Past event - charity gala.', status: 'filled', workerIdx: 0 },
    { bizIdx: 2, ptIdx: 2, sMin: 20, sMax: 25, start: past(72), end: past(64), note: 'Past event - corporate dinner.', status: 'filled', workerIdx: 2 },
    { bizIdx: 1, ptIdx: 1, sMin: 17, sMax: 20, start: past(96), end: past(88), note: 'Completed warehouse shift.', status: 'filled', workerIdx: 1 },
    { bizIdx: 4, ptIdx: 4, sMin: 18, sMax: 21, start: past(120), end: past(112), note: 'Completed reception coverage.', status: 'filled', workerIdx: 4 },
    { bizIdx: 7, ptIdx: 9, sMin: 16, sMax: 20, start: past(144), end: past(136), note: 'Completed retail shift.', status: 'filled', workerIdx: 7 },
    // Currently in-progress filled jobs
    { bizIdx: 0, ptIdx: 0, sMin: 19, sMax: 23, start: past(2), end: h(6), note: 'Ongoing - conference today.', status: 'filled', workerIdx: 9 },
    { bizIdx: 3, ptIdx: 3, sMin: 21, sMax: 25, start: past(1), end: h(11), note: 'Ongoing security shift.', status: 'filled', workerIdx: 12 },
    // Canceled jobs
    { bizIdx: 0, ptIdx: 0, sMin: 18, sMax: 22, start: past(24), end: past(16), note: 'Event was canceled due to weather.', status: 'canceled' },
    { bizIdx: 5, ptIdx: 7, sMin: 17, sMax: 20, start: past(36), end: past(28), note: 'Position no longer needed.', status: 'canceled' },
    // More open jobs for pagination
    { bizIdx: 4, ptIdx: 6, sMin: 18, sMax: 22, start: h(3), end: h(11), note: 'Inbound customer support team.', status: 'open' },
    { bizIdx: 5, ptIdx: 6, sMin: 17, sMax: 20, start: h(4), end: h(12), note: 'Tech support call centre.', status: 'open' },
    { bizIdx: 8, ptIdx: 8, sMin: 21, sMax: 25, start: h(5), end: h(13), note: 'Commercial delivery route.', status: 'open' },
    { bizIdx: 9, ptIdx: 11, sMin: 17, sMax: 21, start: h(6), end: h(14), note: 'Industrial cleaning contract.', status: 'open' },
    { bizIdx: 7, ptIdx: 9, sMin: 17, sMax: 21, start: d(1), end: new Date(d(1).getTime() + 8*3600000), note: 'Weekend retail coverage.', status: 'open' },
    { bizIdx: 1, ptIdx: 1, sMin: 18, sMax: 21, start: d(2), end: new Date(d(2).getTime() + 8*3600000), note: 'Seasonal warehouse surge.', status: 'open' },
    { bizIdx: 2, ptIdx: 2, sMin: 23, sMax: 29, start: d(6), end: new Date(d(6).getTime() + 5*3600000), note: 'Wedding reception service.', status: 'open' },
  ];

  const jobs = [];
  for (const j of jobData) {
    const job = await prisma.job.create({
      data: {
        businessId: businesses[j.bizIdx].id,
        positionTypeId: positionTypes[j.ptIdx].id,
        salary_min: j.sMin,
        salary_max: j.sMax,
        start_time: j.start,
        end_time: j.end,
        note: j.note,
        status: j.status,
        workerId: j.workerIdx != null ? regularUsers[j.workerIdx].id : undefined,
      },
    });
    jobs.push(job);
  }
  console.log(`Created ${jobs.length} jobs`);

  // ─── Interests ────────────────────────────────────────────────────
  // Create mutual interests for open jobs (for testing negotiation)
  const interestData = [
    // Mutual interests (both parties interested)
    { jobIdx: 0, userIdx: 0, candInt: true, bizInt: true },
    { jobIdx: 0, userIdx: 9, candInt: true, bizInt: true },
    { jobIdx: 0, userIdx: 15, candInt: true, bizInt: false },
    { jobIdx: 1, userIdx: 2, candInt: true, bizInt: true },
    { jobIdx: 1, userIdx: 15, candInt: true, bizInt: true },
    { jobIdx: 2, userIdx: 1, candInt: true, bizInt: true },
    { jobIdx: 2, userIdx: 8, candInt: true, bizInt: false },
    { jobIdx: 3, userIdx: 1, candInt: true, bizInt: true },
    { jobIdx: 4, userIdx: 2, candInt: true, bizInt: true },
    { jobIdx: 5, userIdx: 3, candInt: true, bizInt: true },
    { jobIdx: 5, userIdx: 12, candInt: true, bizInt: true },
    { jobIdx: 6, userIdx: 4, candInt: true, bizInt: true },
    { jobIdx: 6, userIdx: 11, candInt: false, bizInt: true },
    { jobIdx: 7, userIdx: 4, candInt: true, bizInt: false },
    { jobIdx: 8, userIdx: 5, candInt: true, bizInt: true },
    { jobIdx: 9, userIdx: 7, candInt: true, bizInt: true },
    { jobIdx: 9, userIdx: 13, candInt: true, bizInt: false },
    { jobIdx: 10, userIdx: 6, candInt: true, bizInt: true },
    { jobIdx: 11, userIdx: 14, candInt: true, bizInt: true },
    { jobIdx: 12, userIdx: 0, candInt: true, bizInt: true },
    { jobIdx: 13, userIdx: 15, candInt: true, bizInt: true },
    { jobIdx: 14, userIdx: 1, candInt: true, bizInt: false },
    { jobIdx: 15, userIdx: 3, candInt: true, bizInt: true },
    { jobIdx: 15, userIdx: 12, candInt: false, bizInt: true },
    { jobIdx: 25, userIdx: 4, candInt: true, bizInt: true },
    { jobIdx: 26, userIdx: 5, candInt: true, bizInt: false },
  ];

  for (const i of interestData) {
    try {
      await prisma.interest.create({
        data: {
          jobId: jobs[i.jobIdx].id,
          userId: regularUsers[i.userIdx].id,
          candidateInterested: i.candInt || null,
          businessInterested: i.bizInt || null,
        },
      });
    } catch (e) {
      // skip
    }
  }
  console.log(`Created interests`);

  // ─── Negotiations ─────────────────────────────────────────────────
  const negWindow = 900; // 15 min default
  const negData = [
    // Active negotiation
    { jobIdx: 0, userIdx: 0, status: 'active', candAcc: false, bizAcc: false, expiresAt: new Date(now.getTime() + negWindow * 1000) },
    // Completed negotiations (for history)
    { jobIdx: 16, userIdx: 0, status: 'completed', candAcc: true, bizAcc: true, expiresAt: new Date(past(47).getTime() + negWindow * 1000) },
    { jobIdx: 17, userIdx: 2, status: 'completed', candAcc: true, bizAcc: true, expiresAt: new Date(past(71).getTime() + negWindow * 1000) },
    { jobIdx: 18, userIdx: 1, status: 'completed', candAcc: true, bizAcc: true, expiresAt: new Date(past(95).getTime() + negWindow * 1000) },
    // Expired negotiation
    { jobIdx: 1, userIdx: 2, status: 'expired', candAcc: false, bizAcc: false, expiresAt: past(1) },
    // Rejected negotiation
    { jobIdx: 2, userIdx: 1, status: 'rejected', candAcc: false, bizAcc: false, expiresAt: new Date(past(50).getTime() + negWindow * 1000) },
  ];

  for (const n of negData) {
    try {
      await prisma.negotiation.create({
        data: {
          jobId: jobs[n.jobIdx].id,
          userId: regularUsers[n.userIdx].id,
          status: n.status,
          expiresAt: n.expiresAt,
          candidateAccepted: n.candAcc,
          businessAccepted: n.bizAcc,
        },
      });
    } catch (e) {
      // skip
    }
  }
  console.log(`Created negotiations`);

  console.log('\n✅ Database seeded successfully!\n');
  console.log('Test accounts (password: 123123):');
  console.log('  Admin:    admin1@csc309.utoronto.ca');
  console.log('  Business: business1@csc309.utoronto.ca  (verified, has jobs & mutual interests)');
  console.log('  Business: business2@csc309.utoronto.ca  (verified, has jobs)');
  console.log('  User:     regular1@csc309.utoronto.ca   (has approved quals, active negotiation)');
  console.log('  User:     regular3@csc309.utoronto.ca   (catering/customer service quals)');
  console.log('  User:     regular16@csc309.utoronto.ca  (catering & event experience)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
