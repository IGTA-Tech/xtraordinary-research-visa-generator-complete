import { NextRequest, NextResponse } from 'next/server';

interface FormFillRequest {
  forms: ('i-129' | 'i-129-op' | 'i-907' | 'g-28')[];
  visaType: 'O-1A' | 'O-1B' | 'O-2' | 'P-1A' | 'P-1B' | 'P-1S';
  petitioner: {
    id?: string; // 'igta', 'accelerator', or 'custom'
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    ein: string;
    contactName?: string;
    contactTitle?: string;
  };
  beneficiary: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string;
    countryOfBirth: string;
    countryOfCitizenship: string;
    passportNumber: string;
    passportExpiry?: string;
    currentAddress?: string;
    email?: string;
    phone?: string;
  };
  position: {
    title: string;
    startDate: string;
    endDate: string;
    salary: string;
    hoursPerWeek?: string;
    duties?: string;
  };
  attorney?: {
    name: string;
    firmName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    barNumber: string;
    email: string;
  };
}

// Pre-configured petitioners
const petitioners: Record<string, Partial<FormFillRequest['petitioner']>> = {
  igta: {
    name: 'Innovative Global Talent Agency LLC',
    address: '123 Business Center Dr',
    city: 'Miami',
    state: 'FL',
    zip: '33131',
    phone: '(305) 555-0100',
    ein: 'XX-XXXXXXX',
  },
  accelerator: {
    name: 'Innovative Global Accelerator Studios LLC',
    address: '456 Creative Blvd',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90028',
    phone: '(310) 555-0200',
    ein: 'XX-XXXXXXX',
  },
};

function generateI129Fields(data: FormFillRequest): Record<string, string> {
  const pet = data.petitioner;
  const ben = data.beneficiary;
  const pos = data.position;

  return {
    // Part 1 - Petitioner Information
    'Pt1Line1_FamilyName': pet.name,
    'Pt1Line2_CompanyName': pet.name,
    'Pt1Line3_StreetNumberName': pet.address,
    'Pt1Line4_CityOrTown': pet.city,
    'Pt1Line5_State': pet.state,
    'Pt1Line6_ZipCode': pet.zip,
    'Pt1Line7_DaytimePhoneNumber': pet.phone,
    'Pt1Line8_FederalEmployerID': pet.ein,

    // Part 2 - Beneficiary Information
    'Pt2Line1_FamilyName': ben.lastName,
    'Pt2Line2_GivenName': ben.firstName,
    'Pt2Line3_MiddleName': ben.middleName || '',
    'Pt2Line4_DateOfBirth': ben.dateOfBirth,
    'Pt2Line5_CountryOfBirth': ben.countryOfBirth,
    'Pt2Line6_CountryOfCitizenship': ben.countryOfCitizenship,
    'Pt2Line7_PassportNumber': ben.passportNumber,

    // Part 3 - Requested Classification
    'Pt3_Classification': data.visaType,

    // Part 4 - Employment Information
    'Pt4Line1_JobTitle': pos.title,
    'Pt4Line2_StartDate': pos.startDate,
    'Pt4Line3_EndDate': pos.endDate,
    'Pt4Line4_WageAmount': pos.salary,
    'Pt4Line5_HoursPerWeek': pos.hoursPerWeek || '40',
  };
}

function generateG28Fields(data: FormFillRequest): Record<string, string> {
  if (!data.attorney) return {};

  const att = data.attorney;
  const pet = data.petitioner;

  return {
    // Part 1 - Attorney Information
    'Pt1Line1_FamilyName': att.name.split(' ').pop() || '',
    'Pt1Line2_GivenName': att.name.split(' ')[0] || '',
    'Pt1Line3_FirmName': att.firmName,
    'Pt1Line4_StreetNumberName': att.address,
    'Pt1Line5_CityOrTown': att.city,
    'Pt1Line6_State': att.state,
    'Pt1Line7_ZipCode': att.zip,
    'Pt1Line8_Phone': att.phone,
    'Pt1Line9_BarNumber': att.barNumber,
    'Pt1Line10_Email': att.email,

    // Part 2 - Client Information
    'Pt2Line1_ClientName': pet.name,
    'Pt2Line2_ClientAddress': pet.address,
    'Pt2Line3_ClientCity': pet.city,
    'Pt2Line4_ClientState': pet.state,
    'Pt2Line5_ClientZip': pet.zip,
  };
}

function generateI907Fields(data: FormFillRequest): Record<string, string> {
  const pet = data.petitioner;
  const ben = data.beneficiary;

  return {
    // Part 1 - Information About the Underlying Petition
    'Pt1Line1_PetitionType': 'I-129',
    'Pt1Line2_Classification': data.visaType,
    'Pt1Line3_BeneficiaryName': `${ben.firstName} ${ben.lastName}`,

    // Part 2 - Petitioner Information
    'Pt2Line1_PetitionerName': pet.name,
    'Pt2Line2_Address': pet.address,
    'Pt2Line3_City': pet.city,
    'Pt2Line4_State': pet.state,
    'Pt2Line5_Zip': pet.zip,
    'Pt2Line6_Phone': pet.phone,

    // Part 3 - Premium Processing Fee
    'Pt3Line1_Fee': '$2,805',
  };
}

function generateOPSupplementFields(data: FormFillRequest): Record<string, string> {
  const ben = data.beneficiary;
  const pos = data.position;

  return {
    // O/P Classification Information
    'Line1_Classification': data.visaType,
    'Line2_BeneficiaryName': `${ben.firstName} ${ben.lastName}`,
    'Line3_Occupation': pos.title,
    'Line4_EventDescription': pos.duties || `Professional ${pos.title} services`,
    'Line5_StartDate': pos.startDate,
    'Line6_EndDate': pos.endDate,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: FormFillRequest = await request.json();
    const { forms, visaType, beneficiary, position } = body;

    // Validate required fields
    if (!forms || forms.length === 0) {
      return NextResponse.json(
        { error: 'At least one form must be selected' },
        { status: 400 }
      );
    }

    if (!beneficiary?.firstName || !beneficiary?.lastName) {
      return NextResponse.json(
        { error: 'Beneficiary name is required' },
        { status: 400 }
      );
    }

    // Apply pre-configured petitioner if specified
    let petitioner = body.petitioner;
    if (petitioner.id && petitioners[petitioner.id]) {
      petitioner = { ...petitioners[petitioner.id], ...petitioner } as FormFillRequest['petitioner'];
    }

    // Generate field mappings for each form
    const filledForms: Record<string, Record<string, string>> = {};

    if (forms.includes('i-129')) {
      filledForms['i-129'] = generateI129Fields({ ...body, petitioner });
    }

    if (forms.includes('g-28')) {
      filledForms['g-28'] = generateG28Fields({ ...body, petitioner });
    }

    if (forms.includes('i-907')) {
      filledForms['i-907'] = generateI907Fields({ ...body, petitioner });
    }

    if (forms.includes('i-129-op')) {
      filledForms['i-129-op'] = generateOPSupplementFields({ ...body, petitioner });
    }

    return NextResponse.json({
      success: true,
      forms: Object.keys(filledForms),
      visaType,
      beneficiary: `${beneficiary.firstName} ${beneficiary.lastName}`,
      petitioner: petitioner.name,
      filledForms,
      generatedAt: new Date().toISOString(),
      note: 'Field mappings generated. Use with PDF filler library to populate actual forms.',
    });

  } catch (error: any) {
    console.error('Form fill error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fill forms' },
      { status: 500 }
    );
  }
}

// Get available form templates
export async function GET() {
  return NextResponse.json({
    forms: [
      {
        id: 'i-129',
        name: 'I-129',
        title: 'Petition for Nonimmigrant Worker',
        pages: 36,
        required: true,
      },
      {
        id: 'i-129-op',
        name: 'I-129 O/P Supplement',
        title: 'Classification Supplement for O and P Nonimmigrants',
        pages: 2,
        required: true,
      },
      {
        id: 'i-907',
        name: 'I-907',
        title: 'Request for Premium Processing',
        pages: 2,
        required: false,
        fee: '$2,805',
      },
      {
        id: 'g-28',
        name: 'G-28',
        title: 'Notice of Entry of Appearance as Attorney',
        pages: 3,
        required: true,
      },
    ],
    petitioners: Object.entries(petitioners).map(([id, data]) => ({
      id,
      name: data.name,
    })),
    visaTypes: ['O-1A', 'O-1B', 'O-2', 'P-1A', 'P-1B', 'P-1S'],
  });
}
