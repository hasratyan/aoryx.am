export type Locale = "hy" | "en" | "ru";

export const locales: Locale[] = ["hy", "en", "ru"];
export const localeLabels: Record<Locale, string> = {
  hy: "ՀԱՅ",
  en: "ENG",
  ru: "РУС",
};
export const defaultLocale: Locale = "hy";

export type PluralForms = {
  zero?: string;
  one: string;
  two?: string;
  other: string;
  few?: string;
  many?: string;
};

export type PolicySection = {
  title: string;
  body?: string;
  items?: string[];
};

export type Translation = {
  nav: { href: string; label: string }[];
  labels: { exclusive: string };
  hero: {
    title: string;
    subtitle: string;
    purpose: string;
    marquee: string;
  };
  search: {
    wherePlaceholder: string;
    loadingDestinations: string;
    noLocations: string;
    adultsLabel: string;
    adultsShort: string;
    childrenLabel: string;
    childrenShort: string;
    childrenAges: string;
    roomsLabel: string;
    roomLabel: string;
    datePlaceholder: string;
    submitIdle: string;
    submitLoading: string;
    expandSearch: string;
    collapseSearch: string;
    unknownHotel: string;
    pickOnMap: string;
    closeMap: string;
    mapLoading: string;
    mapEmpty: string;
    mapHotelsCount: PluralForms;
    mapSelectHint: string;
    errors: {
      missingLocation: string;
      missingDates: string;
      invalidRooms: string;
      missingSession: string;
      submit: string;
    };
  };
  services: {
    title: string;
    items: { icon: string; title: string; description: string }[];
  };
  bundleSave: {
    title: string;
    savings: string;
    features: { icon: string; title: string; description: string }[];
    cta: string;
  };
  packageBuilder: {
    title: string;
    subtitle: string;
    toggleOpen: string;
    toggleClose: string;
    changeHotel: string;
    viewService: string;
    removeTag: string;
    checkoutButton: string;
    helper: string;
    warningSelectHotel: string;
    sessionExpiresIn: string;
    sessionWarningTen: string;
    sessionWarningFive: string;
    sessionExpired: string;
    requiredTag: string;
    selectedTag: string;
    addTag: string;
    disabledTag: string;
    serviceDisabled: string;
      transfers: {
        individual: string;
        group: string;
        startingFrom: string;
        selectType: string;
      perCar: string;
      perPax: string;
      childPolicyLabel: string;
      childPolicyFree: PluralForms;
      childPolicyHalf: PluralForms;
    };
    excursions: {
      allLabel: string;
      yasLabel: string;
      countLabel: PluralForms;
      filterNote: string;
      noMatch: string;
    };
    flights: {
      searchButton: string;
      searching: string;
      searchPrompt: string;
      noOptions: string;
      loadFailed: string;
      demoNote: string;
    };
    services: {
      hotel: string;
      flight: string;
      transfer: string;
      excursion: string;
      insurance: string;
    };
    pages: {
      hotel: { title: string; body: string; note: string; cta: string };
      flight: { title: string; body: string; note: string; cta: string };
      transfer: { title: string; body: string; note: string; cta: string };
      excursion: { title: string; body: string; note: string; cta: string };
      insurance: { title: string; body: string; note: string; cta: string };
    };
    insurance: {
      note: string;
      quoteLabel: string;
      quoteLoading: string;
      selectPlanNote: string;
      coverageLabel: string;
      territoryLabel: string;
      travelCountriesLabel: string;
      travelCountriesPlaceholder: string;
      defaultTravelCountry: string;
      startDateLabel: string;
      endDateLabel: string;
      territories: {
        worldwideExcluding: string;
        worldwideExcludingPolicy: string;
      };
      plans: {
        standard: { title: string; description: string };
      };
    };
    checkout: {
      title: string;
      subtitle: string;
      summaryTitle: string;
      summaryHint: string;
      emptySummary: string;
      pendingDetails: string;
      contactTitle: string;
      contactHint: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      guestTitle: string;
      guestHint: string;
      guestEmpty: string;
      guestRoomLabel: string;
      guestAdultLabel: string;
      guestChildLabel: string;
      guestLeadLabel: string;
      ageLabel: string;
      billingTitle: string;
      billingHint: string;
      country: string;
      city: string;
      address: string;
      zip: string;
      insuranceTitle: string;
      insuranceHint: string;
      insuranceEmpty: string;
      insuranceTravelerLabel: string;
      insuranceFields: {
        firstNameEn: string;
        lastNameEn: string;
        gender: string;
        genderPlaceholder: string;
        genderMale: string;
        genderFemale: string;
        birthDate: string;
        passportNumber: string;
        passportAuthority: string;
        passportIssueDate: string;
        passportExpiryDate: string;
        residency: string;
        citizenship: string;
        socialCard: string;
        mobilePhone: string;
        phone: string;
        email: string;
        address: string;
        addressEn: string;
        country: string;
        region: string;
        city: string;
      };
      couponTitle: string;
      couponPlaceholder: string;
      applyCoupon: string;
      paymentTitle: string;
      paymentHint: string;
      methodIdram: string;
      methodCard: string;
      cardName: string;
      cardNumber: string;
      cardExpiry: string;
      cardCvc: string;
      termsLabel: string;
      termsConnector: string;
      payIdram: string;
      payCard: string;
      totalTitle: string;
      totalLabel: string;
      processingNote: string;
      errors: {
        missingHotel: string;
        missingDetails: string;
        missingGuestDetails: string;
        insuranceDetailsRequired: string;
        insuranceQuoteFailed: string;
        cardUnavailable: string;
        paymentFailed: string;
      };
      labels: {
        destination: string;
        dates: string;
        rooms: string;
        guests: string;
        route: string;
        vehicle: string;
        price: string;
        type: string;
        hotelCode: string;
      };
    };
  };
  trustStats: {
    title: string;
    stats: { value: string; label: string; icon: string }[];
  };
  exclusives: {
    offers: { title: string; badge: string; description: string; cta: string; soon: string }[];
  };
  featured: { title: string; subtitle: string; cta: string };
  faq: {
    title: string;
    items: { title: string; body: string }[];
  };
  card: { from: string; perNight: string; reviews: string; cta: string };
  auth: {
    checking: string;
    signedIn: string;
    signOut: string;
    signIn: string;
    guestInitialsFallback: string;
    guestNameFallback: string;
  };
  accessibility: {
    skipToContent: string;
    servicesSection: string;
    bundleSection: string;
  };
  header: {
    openMenu: string;
    closeMenu: string;
    primaryNav: string;
  };
  footer: {
    refundPolicy: string;
    securityPolicy: string;
    b2bPartnership: string;
    followUs: string;
    poweredBy: string;
    copyright: string;
  };
  home: {
    idram: {
      title: string;
      body: string;
      alt: string;
    };
    efes: {
      title: string;
      body: string;
      alt: string;
    };
    flydubai: {
      title: string;
      body: string;
      alt: string;
    };
    yas: {
      title: string;
      body: string;
      alt: string;
    };
  };
  payment: {
    success: {
      title: string;
      body: string;
      note: string;
      cta: string;
    };
    failure: {
      title: string;
      body: string;
      cta: string;
    };
    errors: {
      invalidBill: string;
      unauthorized: string;
      signInRequired: string;
    };
  };
  profile: {
    title: string;
    subtitle: string;
    memberSince: string;
    signIn: {
      title: string;
      body: string;
      cta: string;
    };
    stats: {
      bookings: string;
      searches: string;
      favorites: string;
      nights: string;
      lastActivity: string;
    };
    bookings: {
      title: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      status: {
        confirmed: string;
        pending: string;
        failed: string;
        unknown: string;
      };
      labels: {
        bookingId: string;
        confirmation: string;
        hotelCode: string;
        destination: string;
        rooms: string;
        guests: string;
        total: string;
        bookedOn: string;
      };
      viewHotel: string;
      viewVoucher: string;
      downloadVoucher: string;
    };
    voucher: {
      title: string;
      subtitle: string;
      downloadPdf: string;
      backToProfile: string;
      issuedOn: string;
      paymentNote: string;
      sections: {
        stay: string;
        payment: string;
        services: string;
        guests: string;
        notes: string;
      };
      notes: string;
    };
    searches: {
      title: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      labels: {
        dates: string;
        results: string;
        rooms: string;
        guests: string;
        destination: string;
        hotel: string;
        searchedOn: string;
      };
      searchAgain: string;
    };
    favorites: {
      title: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      viewHotel: string;
      locationFallback: string;
      labels: {
        rating: string;
        savedOn: string;
        code: string;
      };
    };
    insights: {
      title: string;
      subtitle: string;
      labels: {
        topDestination: string;
        averageStay: string;
        roomsBooked: string;
        lastBooking: string;
      };
      empty: string;
    };
    actions: {
      title: string;
      browse: string;
      items: {
        newSearch: { title: string; body: string; cta: string };
        savedTravelers: { title: string; body: string; cta: string };
        priceAlerts: { title: string; body: string; cta: string };
      };
    };
    errors: {
      title: string;
      body: string;
    };
  };
  admin: {
    title: string;
    subtitle: string;
    dashboard: {
      title: string;
      subtitle: string;
      navTitle: string;
      navSubtitle: string;
      open: string;
      cards: {
        bookings: string;
        featured: string;
        users: string;
        searches: string;
        favorites: string;
        services: string;
      };
    };
    services: {
      title: string;
      subtitle: string;
      panelTitle: string;
      note: string;
      saved: string;
      actions: {
        save: string;
        saving: string;
      };
      status: {
        enabled: string;
        disabled: string;
      };
      errors: {
        saveFailed: string;
      };
    };
    featured: {
      title: string;
      subtitle: string;
      searchTitle: string;
      searchSubtitle: string;
      searchLabel: string;
      searchPlaceholder: string;
      loading: string;
      noResults: string;
      alreadySelected: string;
      formTitle: string;
      formSubtitle: string;
      emptyTitle: string;
      emptyBody: string;
      fields: {
        priceFrom: string;
        oldPrice: string;
        badge: string;
        availability: string;
        amenities: string;
        selected: string;
      };
      previewLabel: string;
      listTitle: string;
      listSubtitle: string;
      listEmptyTitle: string;
      listEmptyBody: string;
      actions: {
        save: string;
        saving: string;
        edit: string;
        remove: string;
        removing: string;
        clear: string;
      };
      validation: {
        selectHotel: string;
        priceFrom: string;
        oldPrice: string;
        amenities: string;
        amenitiesLimit: string;
        translations: string;
      };
      errors: {
        saveFailed: string;
        removeFailed: string;
      };
    };
    users: {
      title: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      stats: {
        total: string;
      };
      columns: {
        user: string;
        email: string;
        lastLogin: string;
        lastSearch: string;
        lastBooking: string;
        createdAt: string;
      };
    };
    searches: {
      title: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      columns: {
        user: string;
        destination: string;
        hotel: string;
        dates: string;
        rooms: string;
        guests: string;
        createdAt: string;
      };
    };
    favorites: {
      title: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
      columns: {
        user: string;
        hotel: string;
        location: string;
        rating: string;
        savedAt: string;
      };
    };
    bookings: {
      title: string;
      subtitle: string;
      emptyTitle: string;
      emptyBody: string;
    };
    filters: {
      searchPlaceholder: string;
      statusLabel: string;
      sourceLabel: string;
      sortLabel: string;
      reset: string;
      all: string;
      sortOptions: {
        newest: string;
        oldest: string;
        totalHigh: string;
        totalLow: string;
      };
    };
    columns: {
      bookingId: string;
      hotel: string;
      user: string;
      dates: string;
      guests: string;
      total: string;
      status: string;
      createdAt: string;
      source: string;
      actions: string;
    };
    stats: {
      totalBookings: string;
      totalGuests: string;
      confirmed: string;
      pending: string;
      failed: string;
      unknown: string;
    };
    access: {
      signInTitle: string;
      signInBody: string;
      signInCta: string;
      deniedTitle: string;
      deniedBody: string;
      configTitle: string;
      configBody: string;
    };
    actions: {
      details: string;
    };
    details: {
      payload: string;
      booking: string;
    };
  };
  policies: {
    refund: {
      title: string;
      intro: string;
      sections: PolicySection[];
      note: string;
    };
    security: {
      title: string;
      intro: string;
      sections: PolicySection[];
      note: string;
    };
  };
  results: {
    filters: {
      button: string;
      openLabel: string;
      closeLabel: string;
      title: string;
      priceRange: string;
      rating: string;
      noPricing: string;
    };
    loading: string;
    errorAlt: string;
    emptyAlt: string;
    emptyMessage: string;
    fallbackTitle: string;
    placesFound: PluralForms;
    sortLabel: string;
    sortOptions: {
      priceAsc: string;
      priceDesc: string;
      ratingDesc: string;
      ratingAsc: string;
    };
    hotel: {
      fallbackName: string;
      unnamed: string;
      locationFallback: string;
    };
    viewOptions: string;
    errors: {
      missingSearchDetails: string;
      loadFailed: string;
    };
  };
  common: {
    backToSearch: string;
    scrollTop: string;
    contact: string;
    contactForRates: string;
    close: string;
    yes: string;
    no: string;
    total: string;
    status: string;
    night: PluralForms;
  };
  hotel: {
    favorites: {
      save: string;
      saved: string;
      saving: string;
      signIn: string;
    };
    addons: {
      title: string;
      subtitle: string;
      badge: string;
      actions: {
        add: string;
        remove: string;
      };
      status: {
        optional: string;
        requested: string;
      };
      summary: {
        rooms: string;
        transfers: string;
        excursions: string;
        insurance: string;
        flights: string;
        requested: string;
      };
      transfers: {
        title: string;
        description: string;
        panelTitle: string;
        airportLabel: string;
        paxLabel: string;
        bagsLabel: string;
        includeReturn: string;
        returnTotal: string;
        oneWayTotal: string;
        perPax: string;
        perVehicle: string;
        bothWays: string;
        flightNumber: string;
        arrivalDate: string;
        vehicleQty: string;
        loading: string;
        noOptions: string;
        missingDestination: string;
        loadFailed: string;
        selectRequired: string;
        detailsRequired: string;
        flightNumberRequired: string;
        arrivalRequired: string;
      };
      excursions: {
        title: string;
        description: string;
        panelTitle: string;
        adultsLabel: string;
        childrenLabel: string;
        feeNote: string;
        loading: string;
        noOptions: string;
        loadFailed: string;
        unnamed: string;
        adultPrice: string;
        childPrice: string;
        totalLabel: string;
        applyAll: string;
      };
      insurance: {
        title: string;
        description: string;
        panelTitle: string;
        noteLabel: string;
        notePlaceholder: string;
        plans: {
          essential: { title: string; description: string };
          complete: { title: string; description: string; highlight: string };
          premium: { title: string; description: string };
        };
      };
      flights: {
        title: string;
        description: string;
        panelTitle: string;
        originLabel: string;
        destinationLabel: string;
        departureLabel: string;
        returnLabel: string;
        cabinLabel: string;
        cabinPlaceholder: string;
        notesLabel: string;
        notesPlaceholder: string;
        cabin: {
          economy: string;
          premium: string;
          business: string;
          first: string;
        };
      };
    };
    map: {
      viewAria: string;
      showButton: string;
      title: string;
      iframeTitle: string;
      ariaLabel: string;
      closeLabel: string;
    };
    amenities: {
      title: string;
      showLess: string;
      showAll: string;
    };
    searchTitle: string;
    roomOptions: {
      loading: string;
      empty: string;
      noMatch: string;
      count: PluralForms;
      of: string;
      filterMeal: string;
      filterPrice: string;
      allMeals: string;
      recommended: string;
      lowestPrice: string;
      highestPrice: string;
      roomOptionFallback: string;
      mealPlans: {
        roomOnly: string;
        breakfast: string;
        halfBoard: string;
        fullBoard: string;
        allInclusive: string;
        ultraAllInclusive: string;
      };
      refundable: string;
      nonRefundable: string;
      roomsLeft: PluralForms;
      roomBreakdown: string;
      signInToBook: string;
      checkingAvailability: string;
      bookNow: string;
    };
    booking: {
      titleFallback: string;
      successMessage: string;
      confirmationNumberLabel: string;
      priceChangeWarning: string;
      priceChangeConfirm: string;
      resetPackageWarning: string;
      resetPackageConfirm: string;
      titles: { mr: string; ms: string; mrs: string; master: string };
      firstNamePlaceholder: string;
      lastNamePlaceholder: string;
      mealPlanLabel: string;
      rateTypeLabel: string;
      bedTypeSingle: string;
      bedTypePlural: string;
      inclusionsLabel: string;
      cancellationPolicyTitle: string;
      noPenaltyDetails: string;
      remarksTitle: string;
      additionalInfo: string;
      roomPriceLabel: string;
      paymentNote: string;
      redirectingToIdram: string;
      payWithIdram: string;
      selectRoom: string;
      closeBookingAria: string;
    };
    policy: {
      freeCancellation: string;
      from: string;
      until: string;
    };
    remarks: {
      types: {
        mandatory: string;
        mandatoryTax: string;
        mandatoryFee: string;
        mandatoryCharge: string;
        optional: string;
        knowBeforeYouGo: string;
        disclaimer: string;
        note: string;
      };
      defaultLabel: string;
    };
    policies: {
      types: {
        cancellation: string;
        noShow: string;
        modification: string;
      };
      defaultLabel: string;
    };
    errors: {
      roomNeedsAdult: string;
      missingGuestNames: string;
      invalidGuestAges: string;
      invalidChildAge: string;
      invalidAdultAge: string;
      checkingSignIn: string;
      signInToBook: string;
      missingSession: string;
      cannotBookOption: string;
      missingRateKeys: string;
      unableBuildGuests: string;
      prebookFailed: string;
      signInToComplete: string;
      confirmPriceChange: string;
      missingSessionPrebook: string;
      missingDestination: string;
      roomMissingRateKey: string;
      roomMissingPrice: string;
      redirectPayment: string;
      startPaymentFailed: string;
      loadHotelFailed: string;
      loadRoomOptionsFailed: string;
    };
  };
  gallery: {
    label: string;
    imageAlt: string;
    closeLabel: string;
    prevLabel: string;
    nextLabel: string;
  };
};

const translations: Record<Locale, Translation> = {
  hy: {
    nav: [
      { href: "#featured", label: "Լավագույն Հյուրանոցներ" },
      { href: "#offers", label: "Բացառիկ Առաջարկներ" },
      { href: "#faq", label: "ՀՏՀ" },
    ],
    labels: { exclusive: "Բացառիկ" },
    hero: {
      title: "ԱՄԷ-ի հյուրանոցների բացառիկ արժեքներ՝ ուղիղ տուրօպերատորից",
      subtitle:
        "Ամրագրեք հյուրանոց, տրանսֆեր, ավիատոմս, ապահովագրություն, էքսկուրսիաներ և թեմատիկ պարկերի տոմսեր մեկ հարթակում՝ առանց միջնորդների և թաքնված վճարների:",
      purpose:
        "Megatours-ը ԱՄԷ-ի առաջատար ճանապարհորդական հարթակն է, որտեղ կարող եք որոնել, համեմատել և ամրագրել ամեն ինչ մեկ վայրում:",
      marquee: " ՀՅՈՒՐԱՆՈՑՆԵՐ  ✦  ՏՐԱՆՍՖԵՐՆԵՐ  ✦  ԹԵՄԱՏԻԿ ՊԱՐԿԵՐԻ ՏՈՄՍԵՐ  ✦  ԷՔՍԿՈՒՐՍԻԱՆԵՐ  ✦  ԱՎԻԱՏՈՄՍԵՐ  ✦  ԱՊԱՀՈՎԱԳՐՈՒԹՅՈՒՆ  ✦ ",
    },
    search: {
      wherePlaceholder: "Քաղաք, կամ հյուրանոց",
      loadingDestinations: "Ուղղությունների բեռնում...",
      noLocations: "Ուղղություն կամ հյուրանոց չի գտնվել",
      adultsLabel: "Մեծահասակ",
      adultsShort: "Մեծ.",
      childrenLabel: "Երեխա",
      childrenShort: "Երխ.",
      childrenAges: "Երեխայի տարիքը",
      roomsLabel: "Սենյակ",
      roomLabel: "Սենյակ",
      datePlaceholder: "Ընտրել ամսաթվերը",
      submitIdle: "Որոնել",
      submitLoading: "Որոնում...",
      expandSearch: "Բացել որոնումը",
      collapseSearch: "Թաքցնել որոնումը",
      unknownHotel: "Անհայտ հյուրանոց",
      pickOnMap: "Ընտրել քարտեզից",
      closeMap: "Փակել քարտեզը",
      mapLoading: "Քարտեզը բեռնվում է...",
      mapEmpty: "Տեղադրության տվյալներով հյուրանոցներ չեն գտնվել",
      mapHotelsCount: { one: "{count} հյուրանոց", other: "{count} հյուրանոց" },
      mapSelectHint: "Ընտրելու համար սեղմեք նշիչի վրա",
      errors: {
        missingLocation: "Խնդրում ենք ընտրել ուղղություն կամ հյուրանոց։",
        missingDates: "Խնդրում ենք ընտրել մուտքի և ելքի ամսաթվերը։",
        invalidRooms: "Սխալ տվյալների պատճառով ձեր սենյակների ընտրությունը վերականգնվել է։ Խնդրում ենք կրկին ընտրել նախընտրությունները։",
        missingSession: "Որոնման սեսիայի տվյալները բացակայում են։ Խնդրում ենք կրկին որոնել։",
        submit: "Չհաջողվեց կատարել որոնումը։",
      },
    },
    services: {
      title: "Ծառայություններ՝ անթերի ուղևորության համար",
      items: [
        {
          icon: "hotel",
          title: "Հյուրանոցներ",
          description: "ԱՄԷ-ի լավագույն հյուրանոցները՝ էքսկլյուզիվ արժեքներով և ներառումներով։",
        },
        {
          icon: "flight",
          title: "Ավիատոմսեր",
          description: "Թռիչքների ուղիղ ամրագրում դեպի ԱՄԷ",
        },
        {
          icon: "directions_car",
          title: "Տրանսֆերներ",
          description: "Խմբային և անհատական տրանսֆերներ՝ օդանավակայանից մինչև հյուրանոց և հակառակ ուղղությամբ։",
        },
        {
          icon: "tour",
          title: "Էքսկուրսիաներ",
          description: "Հատուկ մշակված ծրագրեր՝ կատարյալ հանգստի համար։",
        },
        {
          icon: "attractions",
          title: "Թեմատիկ պարկեր",
          description: "Տոմսեր և առաջարկներ՝ ԱՄԷ-ի ամենապահանջված ատրակցիոնների համար։",
        },
        {
          icon: "shield_with_heart",
          title: "Ապահովագրություն",
          description: "Ճանապարհորդական ապահովագրություն՝ հանգիստ ու պաշտպանված ուղևորության համար։",
        },
      ],
    },
    bundleSave: {
      title: "Միավորեք ծառայությունները և խնայեք մինչև 30%",
      savings: "Խնայեք մինչև 30%",
      features: [
        {
          icon: "savings",
          title: "Հատուկ արժեքներ",
          description: "Ուղիղ համագործակցությունները թույլ են տալիս առաջարկել էքսկլյուզիվ արժեքներ՝ առանց միջնորդավճարների։",
        },
        {
          icon: "schedule",
          title: "Ամեն ինչ մեկ ամրագրմամբ",
          description: "Խնայեք ժամանակ՝ միավորելով ճանապարհորդական ծառայությունները մեկ փաթեթում։",
        },
        {
          icon: "support_agent",
          title: "24/7 աջակցություն",
          description: "Անհատական կոնսիերժ՝ ճանապարհորդության ողջ ընթացքում",
        },
      ],
      cta: "Կազմել փաթեթ",
    },
    packageBuilder: {
      title: "Կազմեք ձեր փաթեթը",
      subtitle: "Ավելացրեք ծառայությունները",
      toggleOpen: "Կազմել փաթեթ",
      toggleClose: "Թաքցնել",
      changeHotel: "Փոխել հյուրանոցը",
      viewService: "Դիտել",
      removeTag: "Հեռացնել",
      checkoutButton: "Անցնել վճարման",
      helper: "Սկզբում ընտրեք հյուրանոց, որպեսզի հասանելի դառնան մնացած լրացուցիչ ծառայությունները։",
      warningSelectHotel: "Փաթեթ կազմելու համար առաջնահերթ ընտրեք հյուրանոց։",
      sessionExpiresIn: "Սեսիայի ավարտին մնացել է",
      sessionWarningTen: "Մնացել է 10 րոպե՝ փաթեթի վճարումը ավարտելու համար։",
      sessionWarningFive: "Մնացել է 5 րոպե՝ փաթեթի վճարումը ավարտելու համար։",
      sessionExpired: "Սեսիան ավարտվել է։ Փաթեթը վերակայվել է։ Խնդրում ենք նորից ընտրել հյուրանոցը։",
      requiredTag: "Պարտադիր",
      selectedTag: "Ընտրված",
      addTag: "Ավելացնել",
      disabledTag: "Անհասանելի",
      serviceDisabled: "\"{service}\" ծառայությունը ժամանակավորապես անհասանելի է։",
      transfers: {
        individual: "Անհատական (մինչև 6 ուղևոր)",
        group: "Խմբային",
        startingFrom: "Սկսած",
        selectType: "Ընտրեք տրանսֆերի տեսակը՝ տարբերակները տեսնելու համար։",
        perCar: "Մեքենայի համար",
        perPax: "Մեկ ուղևոր",
        childPolicyLabel: "Սակագին երեխաների համար",
        childPolicyFree: {
          one: "{count} երեխա անվճար (0-1.99)",
          other: "{count} երեխա անվճար (0-1.99)",
        },
        childPolicyHalf: {
          one: "{count} երեխա 50% զեղչով (2-11.99)",
          other: "{count} երեխա 50% զեղչով (2-11.99)",
        },
      },
      excursions: {
        allLabel: "Բոլոր տարբերակները",
        yasLabel: "Yas Island",
        countLabel: {
          one: "{count} տարբերակ",
          other: "{count} տարբերակ",
        },
        filterNote: "Դիտել տարբերակները",
        noMatch: "Ընտրված ֆիլտրի համար էքսկուրսիաներ չկան։",
      },
      flights: {
        searchButton: "Որոնել թռիչքներ",
        searching: "Թռիչքները որոնվում են...",
        searchPrompt: "Որոնեք՝ հասանելի թռիչքները տեսնելու համար։",
        noOptions: "Տվյալ ամսաթվերի համար թռիչքներ չկան։",
        loadFailed: "Չհաջողվեց բեռնել թռիչքները։",
        demoNote: "Ցուցադրվում են օրինակելի արժեքներ՝ մինչև թեստային հասանելիությունը։",
      },
      services: {
        hotel: "Հյուրանոց",
        flight: "Ավիատոմս",
        transfer: "Տրանսֆեր",
        excursion: "Էքսկուրսիաներ",
        insurance: "Ապահովագրություն",
      },
      pages: {
        hotel: {
          title: "Հյուրանոց",
          body: "ԱՄԷ-ի լավագույն հյուրանոցները՝ էքսկլյուզիվ արժեքներով և ներառումներով։",
          note: "Հյուրանոց ընտրելուց հետո կարող եք ավելացնել այլ ծառայություններ։",
          cta: "Որոնել հյուրանոցներ",
        },
        flight: {
          title: "Ավիատոմսեր",
          body: "Թռիչքների ուղիղ ամրագրում դեպի ԱՄԷ։",
          note: "Ամսաթվերն ու ուղևորների քանակը վերցվում են հյուրանոցի որոնումից։",
          cta: "Որոնել թռիչքներ",
        },
        transfer: {
          title: "Տրանսֆեր",
          body: "Խմբային և անհատական տրանսֆերներ՝ օդանավակայանից մինչև հյուրանոց և հակառակ ուղղությամբ։",
          note: "Սկզբում ընտրեք հյուրանոցը։",
          cta: "Գտնել հյուրանոց",
        },
        excursion: {
          title: "Էքսկուրսիաներ և թեմատիկ պարկեր",
          body: "Թեմատիկ պարկերի տոմսեր և առաջարկներ՝ ԱՄԷ-ի ամենապահանջված ատրակցիոնների համար։",
          note: "Սկզբում ընտրեք հյուրանոցը։",
          cta: "Գտնել հյուրանոց",
        },
        insurance: {
          title: "Ապահովագրություն",
          body: "Ճանապարհորդական ապահովագրություն՝ հանգիստ ու պաշտպանված ուղևորության համար։",
          note: "Պրեմիումը հաշվարկվում է ըստ ճանապարհորդների տարիքի և թարմացվում է վճարման փուլում։",
          cta: "Գտնել հյուրանոց",
        },
      },
      insurance: {
        note: "Պրեմիումը հաշվարկվում է ըստ ճանապարհորդների տարիքի և թարմացվում է վճարման փուլում։",
        quoteLabel: "Կանխատեսվող պրեմիում",
        quoteLoading: "Պրեմիումը հաշվարկվում է...",
        selectPlanNote: "Ընտրեք ապահովագրության պլանը՝ փաթեթին ավելացնելու համար։",
        coverageLabel: "Ծածկույթ՝ {amount}",
        territoryLabel: "Ապահովագրության տարածք",
        travelCountriesLabel: "Ճանապարհորդության երկիր",
        travelCountriesPlaceholder: "օր․ Արաբական Միացյալ Էմիրություն",
        defaultTravelCountry: "Արաբական Միացյալ Էմիրություն",
        startDateLabel: "Սկիզբ",
        endDateLabel: "Ավարտ",
        territories: {
          worldwideExcluding:
            "Ամբողջ աշխարհ (բացառությամբ ԱՄՆ, Կանադա, Ավստրալիա, Ճապոնիա, Շենգենյան երկրներ, Մեծ Բրիտանիա)",
          worldwideExcludingPolicy:
            "Ամբողջ աշխարհ (բացառությամբ ԱՄՆ, Կանադա, Ավստրալիա, Ճապոնիա, Շենգենյան երկրներ, Մեծ Բրիտանիա)",
        },
        plans: {
          standard: {
            title: "Ստանդարտ",
            description: "Հիմնական ճանապարհորդական ծածկույթ EFES-ից։",
          },
        },
      },
      checkout: {
        title: "Վճարում",
        subtitle: "Ստուգեք ձեր փաթեթը և ընտրեք վճարման եղանակը։",
        summaryTitle: "Ընտրված ծառայությունները",
        summaryHint: "Ձեր փաթեթում ընդգրկված ծառայությունները ստորև։",
        emptySummary: "Դեռ ընտրված ծառայություններ չկան։",
        pendingDetails: "Մանրամասները կհաստատվեն ամրագրման ընթացքում։",
        contactTitle: "Կոնտակտային տվյալներ",
        contactHint: "Հաստատումները և թարմացումները կուղարկվեն կոնտակտային անձին։",
        firstName: "Անուն",
        lastName: "Ազգանուն",
        email: "Էլ․ հասցե",
        phone: "Հեռախոս",
        guestTitle: "Հյուրերի տվյալներ",
        guestHint: "Լրացրեք յուրաքանչյուր հյուրի անունը, ազգանունը և տարիքը։",
        guestEmpty: "Հյուրերի տվյալները կհայտնվեն հյուրանոց ընտրելուց հետո։",
        guestRoomLabel: "Սենյակ",
        guestAdultLabel: "Մեծահասակ",
        guestChildLabel: "Երեխա",
        guestLeadLabel: "Գլխավոր հյուր",
        ageLabel: "Տարիք",
        billingTitle: "Վճարման տվյալներ",
        billingHint: "Օգտագործվում է հաշիվների և հաստատման համար։",
        country: "Երկիր",
        city: "Քաղաք",
        address: "Հասցե",
        zip: "Փոստային ինդեքս",
        insuranceTitle: "Ապահովագրության տվյալներ",
        insuranceHint: "Լրացրեք յուրաքանչյուր ճանապարհորդի անձնագրային և կոնտակտային տվյալները։",
        insuranceEmpty: "Ապահովագրությունը ընտրելուց հետո կլրացվեն տվյալները։",
        insuranceTravelerLabel: "Ճանապարհորդ {index}",
        insuranceFields: {
          firstNameEn: "Անուն (լատինատառ)",
          lastNameEn: "Ազգանուն (լատինատառ)",
          gender: "Սեռ",
          genderPlaceholder: "Ընտրել",
          genderMale: "Արական",
          genderFemale: "Իգական",
          birthDate: "Ծննդյան ամսաթիվ",
          passportNumber: "Անձնագրի համար",
          passportAuthority: "Տրման մարմին",
          passportIssueDate: "Տրման ամսաթիվ",
          passportExpiryDate: "Վավերականություն մինչև",
          residency: "Ռեզիդենտություն",
          citizenship: "Քաղաքացիություն",
          socialCard: "Սոց․ քարտ",
          mobilePhone: "Բջջային հեռ․",
          phone: "Հեռախոս",
          email: "Էլ․ հասցե",
          address: "Գրանցման հասցե",
          addressEn: "Հասցե (լատինատառ)",
          country: "Երկիր",
          region: "Տարածաշրջան",
          city: "Քաղաք",
        },
        couponTitle: "Կտրոնի կամ նվեր քարտի կոդ",
        couponPlaceholder: "Մուտքագրեք կոդը",
        applyCoupon: "Կիրառել",
        paymentTitle: "Վճարման եղանակ",
        paymentHint: "Ընտրեք վճարման տարբերակը։",
        methodIdram: "Վճարել Idram-ով",
        methodCard: "Վճարել քարտով",
        cardName: "Քարտի վրա նշված անուն",
        cardNumber: "Քարտի համար",
        cardExpiry: "Վավերականություն (MM/YY)",
        cardCvc: "CVC",
        termsLabel: "Համաձայն եմ",
        termsConnector: "և",
        payIdram: "Վճարել Idram-ով",
        payCard: "Վճարել քարտով",
        totalTitle: "Վճարման ամփոփում",
        totalLabel: "Ընդհանուր",
        processingNote: "Վճարումը կկատարվի ապահով միջավայրում։ Ամրագրումը կհաստատենք ստուգումից հետո։",
        errors: {
          missingHotel: "Խնդրում ենք ընտրել հյուրանոցը շարունակելու համար։",
          missingDetails: "Սենյակների տվյալները բացակայում են։ Խնդրում ենք կրկին ընտրել հյուրանոցը։",
          missingGuestDetails: "Խնդրում ենք լրացնել բոլոր հյուրերի տվյալները։",
          insuranceDetailsRequired: "Լրացրեք ապահովագրության բոլոր անհրաժեշտ տվյալները։",
          insuranceQuoteFailed: "Չհաջողվեց հաշվարկել ապահովագրության արժեքը։",
          cardUnavailable: "Քարտով վճարումը դեռ հասանելի չէ։",
          paymentFailed: "Չհաջողվեց սկսել վճարումը։ Խնդրում ենք կրկին փորձել։",
        },
        labels: {
          destination: "Ուղղություն",
          dates: "Ամսաթվեր",
          rooms: "Սենյակներ",
          guests: "Հյուրեր",
          route: "Երթուղի",
          vehicle: "Մեքենա",
          price: "Գին",
          type: "Տեսակ",
          hotelCode: "Հյուրանոցի կոդ",
        },
      },
    },
    trustStats: {
      title: "Մեզ վստահում են հազարավոր ճանապարհորդներ",
      stats: [
        { value: "50,000+", label: "Գոհ հաճախորդ", icon: "people" },
        { value: "4.9/5", label: "Միջին գնահատական", icon: "star" },
        { value: "24/7", label: "Աջակցություն օնլայն", icon: "support_agent" },
        { value: "100%", label: "Ապահով ամրագրում", icon: "security" },
      ],
    },
    exclusives: {
      offers: [
        {
          title: "Դուբայ",
          badge: "Ամենապահանջված",
          description: "Ժամանակակից քաղաք, լյուքս հյուրանոցներ, շոփինգ, անապատային սաֆարի և ծովափ։",
          cta: "Դիտել Դուբայի առաջարկները",
          soon: "Շուտով"
        },
        {
          title: "Աբու Դաբի",
          badge: "Մշակույթ և ընտանիք",
          description: "Մշակութային տեսարժան վայրեր, Yas Island, թեմատիկ այգիներ և հանգիստ լողափեր։",
          cta: "Դիտել Աբու Դաբի առաջարկները",
          soon: "Շուտով"
        },
        {
          title: "Շարժա",
          badge: "Լավ գին–որակ",
          description: "Ավանդական մթնոլորտ, թանգարաններ, մաքուր լողափեր և մատչելի հանգիստ։",
          cta: "Դիտել Շարժայի առաջարկները",
          soon: "Շուտով"
        },
      ],
    },
    featured: {
      title: "Ընտրված հյուրանոցներ՝ հատուկ առաջարկներով",
      subtitle: "Թափանցիկ պայմաններ, հատուկ առավելություններ և արագ հաստատում։",
      cta: "Դիտել բոլոր առաջարկները",
    },
  faq: {
    title: "Հաճախ տրվող հարցեր",
    items: [
      {
        title: "Ի՞նչ ծառայություններ կարող եմ ամրագրել Megatours-ում",
        body: "Megatours-ում կարող եք ամրագրել հյուրանոցներ ԱՄԷ-ում, ավիատոմսեր, օդանավակայանային տրանսֆերներ, էքսկուրսիաներ, ճանապարհորդական ապահովագրություն և թեմատիկ պարկերի տոմսեր՝ մեկ հարթակում։",
      },
      {
        title: "Արդյո՞ք ցուցադրված գները վերջնական են",
        body: "Այո՛։ Դուք տեսնում եք վերջնական գինը մինչև վճարումը՝ առանց թաքնված վճարների կամ լրացուցիչ միջնորդավճարների։",
      },
      {
        title: "Կարո՞ղ եմ միավորել մի քանի ծառայություն մեկ ամրագրման մեջ",
        body: "Այո՛։ Դուք կարող եք կազմել ձեր անհատական փաթեթը՝ միավորելով հյուրանոցը, տրանսֆերը, ավիատոմսը, ապահովագրությունը և այլ ծառայություններ մեկ ամրագրման շրջանակում։",
      },
      {
        title: "Ինչպե՞ս է իրականացվում վճարումը",
        body: "Վճարումը կարող եք կատարել բանկային քարտի, կամ Idram-ի միջոցով, ինչպես նաև օգտվել RocketLine-ից՝ վճարումը բաժանելով մինչև 60 ամսվա ընթացքում։ Վճարումները կատարվում են անվտանգ միջավայրում։",
      },
      {
        title: "Ինչպե՞ս կարող եմ կապ հաստատել աջակցության հետ",
        body: "Մեր աջակցման թիմը հասանելի է շուրջօրյա՝ հայերեն, ռուսերեն և անգլերեն լեզուներով՝ օգնելու ամրագրման, փոփոխությունների կամ ցանկացած հարցի դեպքում։",
      },
    ],
  },
    card: {
      from: "Սկսած",
      perNight: "/ գիշեր",
      reviews: "ստուգված կարծիքներ",
      cta: "Ամրագրել",
    },
    auth: {
      checking: "Ստուգում...",
      signedIn: "Մուտքագրված",
      signOut: "Ելք",
      signIn: "Մուտք",
      guestInitialsFallback: "Հյուր",
      guestNameFallback: "Հյուր",
    },
    accessibility: {
      skipToContent: "Անցնել հիմնական բովանդակությանը",
      servicesSection: "Մեր ծառայությունների բաժինը",
      bundleSection: "Փաթեթային առաջարկների բաժինը",
    },
    header: {
      openMenu: "Բացել մենյուն",
      closeMenu: "Փակել մենյուն",
      primaryNav: "Գլխավոր նավիգացիա",
    },
    footer: {
      refundPolicy: "Վերադարձի քաղաքականություն",
      securityPolicy: "Գաղտնիության քաղաքականություն",
      b2bPartnership: "B2B համագործակցություն",
      followUs: "Հետևեք մեզ",
      poweredBy: "«MEGATOURS»-ը համարվում է «ՄԵԳԱՓՐՈՋԵՔԹՍ» ՍՊԸ-ի նախագիծը",
      copyright: "Բոլոր իրավունքները պաշտպանված են։",
    },
    home: {
      idram: {
        title: "Հանգստացեք հիմա, վճարեք հետո",
        body: "Օգտվե՛ք RocketLine-ից և վճարեք մինչև 60 ամսվա ընթացքում։",
        alt: "idram",
      },
      efes:{
        title: "Ապահովագրություն՝ ձեր հանգստի համար",
        body: "Ընտրե՛ք ճանապարհորդական ապահովագրություն՝ ձեր հանգիստը լիարժեք անցկացնելու համար՝ սկսած օրական 300 դրամից։",
        alt: "efes"
      },
      flydubai:{
        title: "Ավիատոմսերի ակնթարթային ամրագրում",
        body: "Ամրագրե՛ք flydubai-ի ուղիղ թռիչքները մի քանի քայլով՝ խնայելով ժամանակ և գումար։",
        alt: "flydubai"
      },
      yas:{
        title: "Անմոռանալի զգացումներ՝ Yas Island-ում",
        body: "Բացահայտե՛ք աշխարհի առաջատար թեմատիկ պարկերը՝ տոմսեր սկսած ընդամենը 30,000 դրամից։",
        alt: "yas island"
      },
    },
    payment: {
      success: {
        title: "Վճարումը ստացվել է",
        body: "Շնորհակալություն վճարման համար։ Այժմ հաստատում ենք ձեր ամրագրումը։",
        note: "Եթե հաստատումը մոտ ժամանակում չստանաք, դիմեք աջակցությանը։",
        cta: "Անձնական էջ",
      },
      failure: {
        title: "Վճարումը չի հաջողվել",
        body: "Չհաջողվեց ավարտել վճարումը։ Խնդրում ենք փորձել կրկին կամ դիմել աջակցությանը։",
        cta: "Վերադառնալ գլխավոր էջ",
      },
      errors: {
        invalidBill: "Անվավեր վճարման համար կամ ամրագրումը չի գտնվել:",
        unauthorized: "Դուք չունեք այս ամրագրման մանրամասները տեսնելու թույլտվություն:",
        signInRequired: "Խնդրում ենք մուտք գործել՝ ձեր ամրագրման մանրամասները տեսնելու համար:",
      },
    },
    policies: {
      refund: {
        title: "Վերադարձի քաղաքականություն",
        intro:
          "Այս Վերադարձի քաղաքականությունը սահմանում է ամրագրման չեղարկման, փոփոխման, վերադարձների հաշվարկի, մշակման ժամկետների և վեճերի լուծման կարգը՝ համակարգի կայքի միջոցով իրականացված ծառայությունների համար։ Ամրագրման պահին ցուցադրված կոնկրետ պայմաններն ունեն գերակայող ուժ այս ընդհանուր քաղաքականության նկատմամբ։",
        sections: [
          {
            title: "Սահմանումներ",
            items: [
              "Համակարգ — սույն կայքի միջոցով ծառայություններ մատուցող գործակալ։",
              "Ամրագրում — կայքի միջոցով կատարված հյուրանոցային ամրագրում և/կամ հավելյալ ծառայությունների (տրանսֆեր, էքսկուրսիա, ավիատոմս, ապահովագրություն) պատվեր կամ գնում։",
              "Ծառայություն — հյուրանոցային կացություն, տրանսֆեր, էքսկուրսիա կամ տոմս, ավիատոմս, ապահովագրություն կամ այլ ուղևորական ծառայություն։",
              "Սակագին — ծառայության գինը և դրա կանոնները (վերադարձվող կամ չվերադարձվող, վերջնաժամկետներ, տույժեր և այլն)։",
              "Անվճար չեղարկման ժամկետ — այն ժամանակահատվածը, որի ընթացքում չեղարկումը չի ենթադրում տույժ, եթե դա նախատեսված է սակագնով։",
              "No-show — հյուրի չներկայանալը ծառայությունից օգտվելու համար։",
              "Վերադարձ — վճարված գումարի վերադարձը նույն վճարման եղանակին՝ օրենքով կամ վճարային գործընկերների կանոններով նախատեսված բացառություններով։",
            ],
          },
          {
            title: "Ընդհանուր դրույթներ",
            items: [
              "Ամրագրման կամ գնման իրականացմամբ դուք հաստատում եք, որ ընդունում եք ամրագրման պահին ցուցադրված կոնկրետ պայմանները։",
              "Եթե կոնկրետ պայմանները հակասում են այս քաղաքականությանը, կիրառվում են տվյալ ամրագրման պայմանները։",
              "Որոշ սակագներ կարող են ներառել չվերադարձվող բաղադրիչներ, որոնք վերադարձման ենթակա չեն նույնիսկ թույլատրելի դեպքերում։",
              "Մասնակի չեղարկումները կամ փոփոխությունները կարող են համարվել ամբողջական չեղարկում և ենթարկվել նույն տույժերին։",
              "Բանկային միջնորդավճարները և արժույթի փոխարժեքը սահմանվում են քարտի թողարկողի կողմից և կարող են ազդել վերադարձվող գումարի վրա։",
            ],
          },
          {
            title: "Հյուրանոցային ամրագրումներ",
            items: [
              "Վերադարձը հնարավոր է, եթե չեղարկումը կատարվել է անվճար չեղարկման ժամկետում կամ սակագինը վերադարձվող է։",
              "Վերադարձ չի կատարվում չվերադարձվող սակագների, no-show-ի կամ վերջնաժամկետից հետո չեղարկման դեպքում։",
              "Թույլատրելի վերադարձի դեպքում գումարը հաշվարկվում է հյուրանոցի քաղաքականությամբ՝ նվազեցված տույժերով կամ չվերադարձվող վճարներով։",
            ],
          },
          {
            title: "Տրանսֆերներ և էքսկուրսիաներ",
            items: [
              "Տրանսֆերներն ու էքսկուրսիաները ենթակա են առանձին կանոնների, որոնք կարող են տարբերվել հյուրանոցային պայմաններից։",
              "Վերադարձը հնարավոր է միայն այն դեպքերում, երբ դա հստակ թույլատրված է տվյալ ծառայության պայմաններով։",
              "Սովորաբար վերադարձ չի կատարվում ուշ չեղարկման, no-show-ի կամ անվանական տոմսերի դեպքում։",
            ],
          },
          {
            title: "Ավիատոմսեր (Flydubai)",
            items: [
              "Ավիատոմսերի վերադարձը և փոփոխությունը կարգավորվում են բացառապես ավիաընկերության սակագնային կանոններով։",
              "Վճարումից առաջ անհրաժեշտ է ծանոթանալ Flydubai-ի կիրառելի պայմաններին կայքում տեղադրված հղումով։",
              "Վերադարձը հնարավոր է միայն Flydubai-ից համակարգին վերադարձ կատարելուց հետո և սակագնի թույլատրելիության շրջանակում։",
            ],
          },
          {
            title: "Ճանապարհորդական ապահովագրություն",
            items: [
              "Ապահովագրական փաթեթների վճարները չեն վերադարձվում՝ անկախ ամրագրման հետագա չեղարկումից կամ փոփոխությունից։",
              "Ապահովագրության պայմաններն ու պահանջների կարգը սահմանվում են ապահովագրական պայմանագրով։",
            ],
          },
          {
            title: "Դիմումների և ժամկետների կարգ",
            items: [
              "Չեղարկման կամ վերադարձի դիմումները ներկայացվում են հաստատման նամակում նշված հղումով կամ աջակցությանը դիմելու միջոցով։",
              "Դիմումների նախնական մշակումը սովորաբար իրականացվում է մինչև 48 ժամում։",
              "Ֆինանսական հաստատությունների կողմից վերադարձը կարող է տևել 5–15 աշխատանքային օր։",
            ],
          },
          {
            title: "Վեճեր և պատասխանատվություն",
            items: [
              "Վեճերի դեպքում նախ անհրաժեշտ է դիմել համակարգի աջակցությանը գրավոր։",
              "Chargeback-ի դեպքում կարող են կիրառվել լրացուցիչ ստուգումներ և ժամկետներ։",
              "Մենք պատասխանատու չենք բանկային միջնորդավճարների, փոխարժեքների կամ երրորդ կողմի կանոնների համար՝ օրենքով թույլատրելի սահմաններում։",
            ],
          },
        ],
        note:
          "Հարցերի դեպքում մեր աջակցությունը պատրաստ է օգնել և պարզաբանել վերադարձի կամ չեղարկման պայմանները յուրաքանչյուր կոնկրետ ամրագրման շրջանակում։",
      },
      security: {
        title: "Գաղտնիության քաղաքականություն",
        intro: "Ձեր անձնական տվյալներն ու վճարումները պաշտպանված են ժամանակակից անվտանգության միջոցներով և վերահսկվող մուտքով։",
        sections: [
          {
            title: "Տվյալների պաշտպանություն",
            items: [
              "Բոլոր տվյալները կոդավորված են փոխանցման ընթացքում։",
              "Մուտքը սահմանափակ է միայն լիազորված անձանց։",
              "Հավաքում ենք միայն ամրագրման համար անհրաժեշտ նվազագույն տվյալները։",
            ],
          },
          {
            title: "Վճարումների անվտանգություն",
            body: "Վճարումները կատարվում են վստահելի գործընկերների միջոցով, իսկ քարտային տվյալները մշակվում են բացառապես նրանց կողմից։",
            items: [
              "Անվտանգ վճարման միջավայր և խարդախության մշտադիտարկում։",
              "3-D Secure կամ համարժեք հաստատում՝ հնարավորության դեպքում։",
              "Հաստատման փաստաթղթերը ուղարկվում են ձեր նշած էլ. հասցեին։",
            ],
          },
          {
            title: "Հաշվի պաշտպանություն",
            items: [
              "Մուտք՝ վստահելի ծառայությունների միջոցով (օր.՝ Google)։",
              "Կարևոր փոփոխությունների դեպքում՝ արագ ծանուցումներ։",
              "Կասկածելի ակտիվության դեպքում աջակցությունը կօգնի ստուգել և պաշտպանել հաշիվը։",
            ],
          },
          {
            title: "Ձեր անվտանգության խորհուրդները",
            items: [
              "Օգտագործեք ուժեղ և եզակի գաղտնաբառ ձեր էլ. փոստի համար։",
              "Չկիսվեք հաստատման կոդերով կամ վճարային տվյալներով։",
              "Օգտագործեք միայն պաշտոնական megatours.am կայքը։",
            ],
          },
          {
            title: "Խնդրի դեպքում",
            body: "Կասկածի դեպքում անմիջապես կապվեք մեր աջակցությանը՝ ձեր հաշիվը պաշտպանելու համար։",
          },
        ],
        note: "Մենք շարունակաբար բարելավում ենք մեր անվտանգության համակարգերը՝ ձեր վստահությունը պահպանելու համար։",
      },
    },
    profile: {
      title: "Ձեր ճանապարհորդության վահանակը",
      subtitle: "Ամրագրումները, որոնումները և կարևոր մանրամասները՝ մեկ վայրում։",
      memberSince: "Ակտիվ է",
      signIn: {
        title: "Մուտք գործեք՝ ձեր ուղևորությունները տեսնելու համար",
        body: "Մուտք գործեք Google-ով՝ տեսնելու ամրագրումները, որոնման պատմությունը և նախընտրությունները։",
        cta: "Մուտք գործել Google-ով",
      },
      stats: {
        bookings: "Ընդհանուր ամրագրումներ",
        searches: "Պահպանված որոնումներ",
        favorites: "Նախընտրած հյուրանոցներ",
        nights: "Փնտրված գիշերներ",
        lastActivity: "Վերջին ակտիվություն",
      },
      bookings: {
        title: "Ձեր ամրագրումները",
        subtitle: "Կարգավիճակը և հաստատումները՝ մեկ հայացքով։",
        emptyTitle: "Ամրագրումներ դեռ չկան",
        emptyBody: "Երբ ամրագրեք, այստեղ կտեսնեք բոլոր հաստատման համարները։",
        status: {
          confirmed: "Հաստատված",
          pending: "Մշակման մեջ",
          failed: "Չհաջողված",
          unknown: "Սպասման մեջ",
        },
        labels: {
          bookingId: "Ամրագրման ID",
          confirmation: "Հաստատում",
          hotelCode: "Հյուրանոցի կոդ",
          destination: "Ուղղություն",
          rooms: "Սենյակներ",
          guests: "Հյուրեր",
          total: "Ընդհանուր",
          bookedOn: "Ամրագրման ամսաթիվ",
        },
        viewHotel: "Դիտել հյուրանոցը",
        viewVoucher: "Դիտել վաուչերը",
        downloadVoucher: "Ներբեռնել PDF",
      },
      voucher: {
        title: "Ամրագրման վաուչեր",
        subtitle: "Պահպանեք վաուչերը՝ հյուրանոցում և ծառայություններում ներկայացնելու համար։",
        downloadPdf: "Ներբեռնել PDF",
        backToProfile: "Վերադառնալ պրոֆիլ",
        issuedOn: "Տրված է",
        paymentNote: "Այս վաուչերը հաստատում է ձեր ամրագրումը։",
        sections: {
          stay: "Հյուրանոցային տվյալներ",
          payment: "Վճարման ամփոփում",
          services: "Ներառումներ",
          guests: "Հյուրերի ցուցակ",
          notes: "Կարևոր նշումներ",
        },
        notes: "Խնդրում ենք պահել վաուչերը և ներկայացնել անհրաժեշտության դեպքում։",
      },
      searches: {
        title: "Որոնման պատմություն",
        subtitle: "Վերաբացեք որոնումը մի քանի վայրկյանում։",
        emptyTitle: "Որոնումներ դեռ չկան",
        emptyBody: "Սկսեք որոնել՝ և ձեր վերջին որոնումները կպահվեն այստեղ։",
        labels: {
          dates: "Ամսաթվեր",
          results: "Արդյունքներ",
          rooms: "Սենյակներ",
          guests: "Հյուրեր",
          destination: "Ուղղություն",
          hotel: "Հյուրանոց",
          searchedOn: "Որոնման ամսաթիվ",
        },
        searchAgain: "Կրկնել որոնումը",
      },
      favorites: {
        title: "Նախընտրած հյուրանոցներ",
        subtitle: "Ձեր պահպանված տարբերակները՝ արագ վերադարձի համար։",
        emptyTitle: "Դեռ նախընտրած հյուրանոցներ չկան",
        emptyBody: "Հյուրանոցի էջում ընտրեք «Պահպանել»՝ որպեսզի վերադառնաք այստեղ մեկ հպումով։",
        viewHotel: "Դիտել հյուրանոցը",
        locationFallback: "Ուղղությունը նշված չէ",
        labels: {
          rating: "Կատեգորիա",
          savedOn: "Պահպանված է",
          code: "Հյուրանոցի կոդ",
        },
      },
      insights: {
        title: "Վերլուծություն",
        subtitle: "Ձեր ճանապարհորդական սովորությունների արագ պատկեր։",
        labels: {
          topDestination: "Ամենապահանջված ուղղություն",
          averageStay: "Միջին տևողություն",
          roomsBooked: "Ամրագրված սենյակներ",
          lastBooking: "Վերջին ամրագրում",
        },
        empty: "Դեռ տվյալներ չկան",
      },
      actions: {
        title: "Արագ գործողություններ",
        browse: "Դիտել ընտրվածները",
        items: {
          newSearch: {
            title: "Նոր որոնում",
            body: "Գտեք թարմ գներ բոլոր էմիրաթներում։",
            cta: "Որոնել հյուրանոցներ",
          },
          savedTravelers: {
            title: "Պահպանված հյուրեր",
            body: "Պահպանեք տվյալները՝ արագ ամրագրման համար։",
            cta: "Շուտով",
          },
          priceAlerts: {
            title: "Գնային ազդարարումներ",
            body: "Հետևեք գներին և ստացեք ծանուցումներ։",
            cta: "Շուտով",
          },
        },
      },
    errors: {
      title: "Տվյալները բեռնել չհաջողվեց",
      body: "Խնդրում ենք կրկին փորձել մի փոքր ուշ։",
    },
  },
  admin: {
    title: "Ադմին վահանակ",
    subtitle: "Վերահսկեք բոլոր ամրագրումները և գործողությունները մեկ տեղից։",
    dashboard: {
      title: "Ադմին կառավարման վահանակ",
      subtitle: "Արագ անցում դեպի բոլոր ադմին բաժինները։",
      navTitle: "Բաժիններ",
      navSubtitle: "Ընտրեք կառավարման բաժինը՝ շարունակելու համար։",
      open: "Բացել",
      cards: {
        bookings: "Դիտեք և վերահսկեք բոլոր ամրագրումները։",
        featured: "Կազմեք գլխավոր էջի հյուրանոցների շարքը։",
        users: "Դիտեք օգտատերերի տվյալները և ակտիվությունը։",
        searches: "Վերահսկեք օգտատերերի որոնումները։",
        favorites: "Դիտեք պահպանված հյուրանոցները։",
        services: "Կառավարեք ծառայությունների հասանելիությունը։",
      },
    },
    services: {
      title: "Ծառայությունների հասանելիություն",
      subtitle: "Ակտիվացրեք կամ անջատեք ծառայությունները օգտատերերի համար։",
      panelTitle: "Հասանելի ծառայություններ",
      note: "Անջատված ծառայությունները անգործուն կլինեն փաթեթ կազմելու ընթացքում։",
      saved: "Պահպանված է",
      actions: {
        save: "Պահպանել փոփոխությունները",
        saving: "Պահպանվում է...",
      },
      status: {
        enabled: "Ակտիվ",
        disabled: "Անջատված",
      },
      errors: {
        saveFailed: "Չհաջողվեց պահպանել փոփոխությունները։",
      },
    },
    featured: {
      title: "Ընտրված հյուրանոցներ",
      subtitle: "Կազմակերպեք գլխավոր էջի հյուրանոցների շարքակազմը։",
      searchTitle: "Որոնել Aoryx հյուրանոցներ",
      searchSubtitle: "Ընտրեք 4+ կատեգորիաներով հյուրանոց և լրացրեք քարտի տվյալները։",
      searchLabel: "Գտնել հյուրանոց",
      searchPlaceholder: "Որոնել ըստ անվան կամ ուղղության",
      loading: "Բեռնվում են հյուրանոցները...",
      noResults: "Հյուրանոցներ չեն գտնվել",
      alreadySelected: "Արդեն ընտրված է",
      formTitle: "Քարտի տվյալներ",
      formSubtitle: "Ավելացրեք գներ և տեղայնացված պիտակ/առկայություն։",
      emptyTitle: "Ընտրեք հյուրանոց",
      emptyBody: "Ընտրեք հյուրանոցը որոնման արդյունքներից։",
      fields: {
        priceFrom: "Գին",
        oldPrice: "Հին գին",
        badge: "Պիտակի տեքստ",
        availability: "Առկայություն",
        amenities: "Հարմարություններ",
        selected: "ընտրված",
      },
      previewLabel: "Նախադիտում",
      listTitle: "Ընտրված հյուրանոցների ցանկ",
      listSubtitle: "Կառավարեք գլխավոր էջում ցուցադրվող հյուրանոցները։",
      listEmptyTitle: "Ընտրված հյուրանոցներ դեռ չկան",
      listEmptyBody: "Ավելացրեք առաջին հյուրանոցը որոնման ցանկից։",
      actions: {
        save: "Պահպանել",
        saving: "Պահպանվում է...",
        edit: "Խմբագրել",
        remove: "Հեռացնել",
        removing: "Հեռացվում է...",
        clear: "Մաքրել",
      },
      validation: {
        selectHotel: "Նախ ընտրեք հյուրանոցը։",
        priceFrom: "Նշեք գին՝ 0-ից բարձր։",
        oldPrice: "Նշեք հին գին՝ 0-ից բարձր։",
        amenities: "Ընտրեք ուղիղ 3 հարմարություն։",
        amenitiesLimit: "Կարող եք ընտրել մինչև 3 հարմարություն։",
        translations: "Լրացրեք պիտակը և առկայությունը բոլոր լեզուներով։",
      },
      errors: {
        saveFailed: "Չհաջողվեց պահպանել հյուրանոցը։",
        removeFailed: "Չհաջողվեց հեռացնել հյուրանոցը։",
      },
    },
    users: {
      title: "Օգտատերեր",
      subtitle: "Վերջին օգտատերերը և նրանց ակտիվությունը։",
      emptyTitle: "Օգտատերեր չեն գտնվել",
      emptyBody: "Տվյալներ դեռ չկան։",
      stats: {
        total: "Ընդհանուր օգտատերեր",
      },
      columns: {
        user: "Օգտատեր",
        email: "Էլ. հասցե",
        lastLogin: "Վերջին մուտք",
        lastSearch: "Վերջին որոնում",
        lastBooking: "Վերջին ամրագրում",
        createdAt: "Ստեղծվել է",
      },
    },
    searches: {
      title: "Որոնումներ",
      subtitle: "Վերջին որոնումների պատմություն։",
      emptyTitle: "Որոնումներ չեն գտնվել",
      emptyBody: "Տվյալներ դեռ չկան։",
      columns: {
        user: "Օգտատեր",
        destination: "Ուղղություն",
        hotel: "Հյուրանոց",
        dates: "Ամսաթվեր",
        rooms: "Սենյակներ",
        guests: "Հյուրեր",
        createdAt: "Ստեղծվել է",
      },
    },
    favorites: {
      title: "Պահպանված հյուրանոցներ",
      subtitle: "Օգտատերերի պահված հյուրանոցները։",
      emptyTitle: "Պահպանված հյուրանոցներ չկան",
      emptyBody: "Տվյալներ դեռ չկան։",
      columns: {
        user: "Օգտատեր",
        hotel: "Հյուրանոց",
        location: "Լոկացիա",
        rating: "Կատեգորիա",
        savedAt: "Պահպանված է",
      },
    },
    bookings: {
      title: "Բոլոր ամրագրումները",
      subtitle: "Ֆիլտրեք ըստ հյուրանոցի, օգտատիրոջ կամ կարգավիճակի։",
      emptyTitle: "Ամրագրումներ չեն գտնվել",
      emptyBody: "Փորձեք փոխել ֆիլտրերը կամ որոնումը։",
    },
    filters: {
      searchPlaceholder: "Որոնել հյուրանոց, ամրագրման ID, էլ. հասցե...",
      statusLabel: "Կարգավիճակ",
      sourceLabel: "Աղբյուր",
      sortLabel: "Դասավորել",
      reset: "Մաքրել",
      all: "Բոլորը",
      sortOptions: {
        newest: "Նորից հին",
        oldest: "Հնից նոր",
        totalHigh: "Գինը բարձրից ցածր",
        totalLow: "Գինը ցածրից բարձր",
      },
    },
    columns: {
      bookingId: "Ամրագրման ID",
      hotel: "Հյուրանոց",
      user: "Օգտատեր",
      dates: "Ամսաթվեր",
      guests: "Հյուրեր",
      total: "Ընդհանուր",
      status: "Կարգավիճակ",
      createdAt: "Ստեղծվել է",
      source: "Աղբյուր",
      actions: "Մանրամասներ",
    },
    stats: {
      totalBookings: "Ընդհանուր ամրագրումներ",
      totalGuests: "Ընդհանուր հյուրեր",
      confirmed: "Հաստատված",
      pending: "Մշակման մեջ",
      failed: "Չհաջողված",
      unknown: "Անհայտ",
    },
    access: {
      signInTitle: "Մուտք գործեք՝ ադմին վահանակը բացելու համար",
      signInBody: "Ադմինի մուտքը սահմանափակ է։ Խնդրում ենք մուտք գործել՝ շարունակելու համար։",
      signInCta: "Մուտք գործել Google-ով",
      deniedTitle: "Մուտքը սահմանափակ է",
      deniedBody: "Այս էջը հասանելի է միայն ադմին օգտատերերին։",
      configTitle: "Ադմինի մուտքը կազմաձևված չէ",
      configBody: "Սահմանեք ADMIN_EMAILS (կամ ADMIN_USER_IDS/ADMIN_EMAIL_DOMAINS) փոփոխականը։",
    },
    actions: {
      details: "Մանրամասներ",
    },
    details: {
      payload: "Պատվերի տվյալներ",
      booking: "Ամրագրման արդյունք",
    },
  },
  results: {
      filters: {
        button: "Ֆիլտրեր",
        openLabel: "Բացել ֆիլտրերը",
        closeLabel: "Փակել ֆիլտրերը",
        title: "Ֆիլտրեր",
        priceRange: "Գնի միջակայք",
        rating: "Կատեգորիա",
        noPricing: "Գնի տվյալները հասանելի չեն։",
      },
      loading: "Տարբերակների որոնում...",
      errorAlt: "Սխալ",
      emptyAlt: "Տարբերակներ չկան",
      emptyMessage: "Այս որոնման համար տարբերակներ չգտնվեց։ Փորձեք փոխել ամսաթվերը կամ ուղղությունը։",
      fallbackTitle: "Որոնման արդյունքներ",
      placesFound: {
        one: "Գտնվեց {count} տարբերակ",
        other: "Գտնվեց {count} տարբերակ",
      },
      sortLabel: "Դասավորել ըստ",
      sortOptions: {
        priceAsc: "Գին (ցածրից բարձր)",
        priceDesc: "Գին (բարձրից ցածր)",
        ratingDesc: "Կատեգորիա (բարձրից ցածր)",
        ratingAsc: "Կատեգորիա (ցածրից բարձր)",
      },
      hotel: {
        fallbackName: "Հյուրանոց",
        unnamed: "Անվանված չէ",
        locationFallback: "ԱՄԷ",
      },
      viewOptions: "Դիտել տարբերակները",
      errors: {
        missingSearchDetails: "Բացակայում են որոնման տվյալները։",
        loadFailed: "Այս պահին արդյունքները բեռնել չհաջողվեց։",
      },
    },
    common: {
      backToSearch: "Վերադառնալ որոնմանը",
      scrollTop: "Վերև գնալ",
      contact: "Կապվել",
      contactForRates: "Արժեքների ճշտման համար խնդրում ենք կապ հաստատել մեզ հետ։",
      close: "Փակել",
      yes: "Այո",
      no: "Ոչ",
      total: "Ընդամենը",
      status: "Կարգավիճակ",
      night: {
        one: "{count} գիշեր",
        other: "{count} գիշեր",
      },
    },
    hotel: {
      favorites: {
        save: "Պահպանել նախընտրածներում",
        saved: "Պահպանված է",
        saving: "Պահպանվում է...",
        signIn: "Մուտք գործեք՝ պահելու համար",
      },
      addons: {
        title: "Փաթեթի կառուցում",
        subtitle: "Ավելացրեք տրանսֆեր, էքսկուրսիաներ, ապահովագրություն և ավիատոմսեր մի քանի քայլով։",
        badge: "Լրացուցիչ ընտրանքներ",
        actions: {
          add: "Ավելացնել",
          remove: "Հանել",
        },
        status: {
          optional: "Ընտրովի",
          requested: "Պահանջված",
        },
        summary: {
          rooms: "Սենյակներ",
          transfers: "Տրանսֆերներ",
          excursions: "Էքսկուրսիաներ",
          insurance: "Ապահովագրություն",
          flights: "Ավիատոմսեր",
          requested: "Պահանջված",
        },
        transfers: {
          title: "Տրանսֆեր",
          description: "Օդանավակայանային տրանսֆերներ ձեր հանգստի համար։",
          panelTitle: "Տրանսֆերի տարբերակներ",
          airportLabel: "Օդանավակայան",
          paxLabel: "ուղևոր",
          bagsLabel: "պայուսակ",
          includeReturn: "Ներառել վերադարձը",
          returnTotal: "Վերադարձով ընդհանուր",
          oneWayTotal: "Միակողմանի ընդհանուր",
          perPax: "Մեկ ուղևոր",
          perVehicle: "Մեկ մեքենա",
          bothWays: "Երկու ուղղություն",
          flightNumber: "Թռիչքի համարը",
          arrivalDate: "Ժամանման ամսաթիվ և ժամ",
          vehicleQty: "Մեքենաների քանակ",
          loading: "Բեռնվում են տրանսֆերի տարբերակները...",
          noOptions: "Տվյալ ուղղության համար տրանսֆերի տարբերակներ առկա չեն։",
          missingDestination: "Ընտրեք ուղղություն՝ տրանսֆերները տեսնելու համար։",
          loadFailed: "Չհաջողվեց բեռնել տրանսֆերները։",
          selectRequired: "Խնդրում ենք ընտրել տրանսֆեր կամ անջատել տրանսֆերները։",
          detailsRequired: "Խնդրում ենք լրացնել թռիչքի տվյալները։",
          flightNumberRequired: "Պետք է նշել թռիչքի համարը։",
          arrivalRequired: "Պետք է նշել ժամանման ամսաթիվն ու ժամը։",
        },
        excursions: {
          title: "Էքսկուրսիաներ",
          description: "Ընտրված փորձառություններ ձեր ճանապարհորդության համար։",
          panelTitle: "Էքսկուրսիոն տարբերակներ",
          adultsLabel: "Մեծահասակներ",
          childrenLabel: "Երեխաներ",
          feeNote: "Գները ներառում են սպասարկման վճարը։",
          loading: "Բեռնվում են էքսկուրսիաները...",
          noOptions: "Էքսկուրսիաներ այժմ հասանելի չեն։",
          loadFailed: "Չհաջողվեց բեռնել էքսկուրսիաները։",
          unnamed: "Էքսկուրսիա",
          adultPrice: "Մեծահասակ",
          childPrice: "Երեխա",
          totalLabel: "Ընդհանուր",
          applyAll: "Կիրառել բոլոր հյուրերի համար",
        },
        insurance: {
          title: "Ապահովագրություն",
          description: "Ճանապարհորդական ապահովագրություն՝ ձեր հանգստի համար։",
          panelTitle: "Ընտրեք ապահովագրության տարբերակ",
          noteLabel: "Հատուկ նշումներ (ըստ ցանկության)",
          notePlaceholder: "Նշեք ցանկալի ծածկույթները։",
          plans: {
            essential: {
              title: "Հիմնական",
              description: "Բժշկական և չեղարկման հիմնական ծածկույթ։",
            },
            complete: {
              title: "Լիարժեք",
              description: "Լրացուցիչ ծածկույթներ՝ ուշացումներ, ուղեբեռ և այլն։",
              highlight: "Առաջարկվող",
            },
            premium: {
              title: "Պրեմիում",
              description: "Լիարժեք պաշտպանություն՝ ավելի բարձր սահմաններով։",
            },
          },
        },
        flights: {
          title: "Ավիատոմսեր",
          description: "Նշեք ձեր երթուղին, մենք կառաջարկենք լավագույն գները։",
          panelTitle: "Թռիչքի հարցում",
          originLabel: "Որտեղից",
          destinationLabel: "Ուր",
          departureLabel: "Մեկնելու ամսաթիվ",
          returnLabel: "Վերադարձի ամսաթիվ",
          cabinLabel: "Սրահի դաս",
          cabinPlaceholder: "Ընտրել սրահը",
          notesLabel: "Նշումներ",
          notesPlaceholder: "Նախընտրելի ավիաընկերություններ, ճկունություն և այլն։",
          cabin: {
            economy: "Էկոնոմ",
            premium: "Պրեմիում էկոնոմ",
            business: "Բիզնես",
            first: "Առաջին",
          },
        },
      },
      map: {
        viewAria: "Դիտել հյուրանոցը քարտեզում",
        showButton: "Ցուցադրել քարտեզում",
        title: "Հյուրանոցի տեղակայումը",
        iframeTitle: "Հյուրանոցի քարտեզ",
        ariaLabel: "Հյուրանոցի քարտեզ",
        closeLabel: "Փակել քարտեզը",
      },
      amenities: {
        title: "Հյուրանոցի հարմարություններ",
        showLess: "Փակել",
        showAll: "Ցուցադրել բոլորը",
      },
      searchTitle: "Ստեղծիր քո հաջորդ անմոռանալի փորձառությունը",
      roomOptions: {
        loading: "Բեռնում ենք սենյակների տարբերակները...",
        empty: "Սենյակների տարբերակներ չկան։",
        noMatch: "Ֆիլտրերին համապատասխան տարբերակ չի գտնվել։",
        count: {
          one: "{count} սենյակի տարբերակ",
          other: "{count} սենյակի տարբերակ",
        },
        of: "{total}-ից",
        filterMeal: "Սննդակարգ",
        filterPrice: "Գին",
        allMeals: "Բոլոր սննդակարգերը",
        recommended: "Առաջարկվող",
        lowestPrice: "Ամենացածր գին",
        highestPrice: "Ամենաբարձր գին",
        roomOptionFallback: "Սենյակի տարբերակ",
        mealPlans: {
          roomOnly: "Առանց սննդի",
          breakfast: "Նախաճաշ",
          halfBoard: "Կիսապանսիոն",
          fullBoard: "Լիարժեք պանսիոն",
          allInclusive: "Ամեն ինչ ներառված",
          ultraAllInclusive: "Ուլտրա ամեն ինչ ներառված",
        },
        refundable: "Վերադարձվող",
        nonRefundable: "Չվերադարձվող",
        roomsLeft: {
          one: "Մնաց {count} սենյակ",
          other: "Մնաց {count} սենյակ",
        },
        roomBreakdown: "Սենյակ {index}: {price}",
        signInToBook: "Մուտք գործեք՝ ամրագրելու համար",
        checkingAvailability: "Ստուգում ենք առկայությունը...",
        bookNow: "Ամրագրել",
      },
      booking: {
        titleFallback: "Հյուրերի տվյալներ",
        successMessage: "Ամրագրման հայտը հաջողությամբ ուղարկվեց։",
        confirmationNumberLabel: "Հաստատման համար",
        priceChangeWarning: "Ստուգման ընթացքում գինը փոխվել է։ Խնդրում ենք հաստատել նոր գինը։",
        priceChangeConfirm: "Հաստատում եմ նոր գինը և ցանկանում եմ շարունակել։",
        resetPackageWarning: "Նախապես ընտրված տարբերակը փոխելիս փաթեթը կվերագործարկվի",
        resetPackageConfirm: "Հաստատում եմ՝ վերակայել փաթեթը։",
        titles: {
          mr: "Պրն.",
          ms: "Տիկ.",
          mrs: "Տիկ.",
          master: "Տղա",
        },
        firstNamePlaceholder: "Անուն",
        lastNamePlaceholder: "Ազգանուն",
        mealPlanLabel: "Սննդակարգ",
        rateTypeLabel: "Սակագնի տեսակ",
        bedTypeSingle: "Մահճակալի տեսակ",
        bedTypePlural: "Մահճակալների տեսակներ",
        inclusionsLabel: "Ներառված է",
        cancellationPolicyTitle: "Չեղարկման պայմաններ",
        noPenaltyDetails: "Տույժերի մանրամասներ չեն նշվել։",
        remarksTitle: "Նշումներ",
        additionalInfo: "Լրացուցիչ տեղեկություն",
        roomPriceLabel: "Սենյակի գինը",
        paymentNote: "Դուք կվերուղղորդվեք Idram՝ վճարումը ավարտելու համար։",
        redirectingToIdram: "Ուղարկում ենք Idram...",
        payWithIdram: "Վճարել Idram-ով",
        selectRoom: "Ընտրել այս տարբերակը",
        closeBookingAria: "Փակել ամրագրման պատուհանը",
      },
      policy: {
        freeCancellation: "Անվճար չեղարկում",
        from: "Սկսած",
        until: "մինչև",
      },
      remarks: {
        types: {
          mandatory: "Պարտադիր",
          mandatoryTax: "Պարտադիր հարկ",
          mandatoryFee: "Պարտադիր վճար",
          mandatoryCharge: "Պարտադիր գանձում",
          optional: "Ընտրովի",
          knowBeforeYouGo: "Ճամփորդությունից առաջ կարևոր",
          disclaimer: "Պատասխանատվության հրաժարում",
          note: "Նշում",
        },
        defaultLabel: "Տեղեկություն",
      },
      policies: {
        types: {
          cancellation: "Չեղարկում",
          noShow: "Չներկայացում",
          modification: "Փոփոխություն",
        },
        defaultLabel: "Քաղաքականություն",
      },
      errors: {
        roomNeedsAdult: "Սենյակ {room}-ը պետք է ունենա առնվազն մեկ մեծահասակ։",
        missingGuestNames: "Խնդրում ենք լրացնել յուրաքանչյուր հյուրի անունն ու ազգանունը։",
        invalidGuestAges: "Հյուրերի տարիքը պետք է լինի ճիշտ թիվ։",
        invalidChildAge: "Երեխայի տարիքը պետք է լինի 0-ից 17։",
        invalidAdultAge: "Մեծահասակների տարիքը պետք է լինի առնվազն 18։",
        checkingSignIn: "Ստուգում ենք մուտքի կարգավիճակը։ Խնդրում ենք փորձել կրկին։",
        signInToBook: "Խնդրում ենք մուտք գործել՝ այս սենյակը ամրագրելու համար։",
        missingSession: "Սեսիայի տվյալները բացակայում են։ Խնդրում ենք կրկին կատարել որոնում։",
        cannotBookOption: "Այս տարբերակը այժմ հնարավոր չէ ամրագրել։ Խնդրում ենք ընտրել այլ տարբերակ։",
        missingRateKeys: "Սակագնի տվյալները բացակայում են։ Խնդրում ենք ընտրել այլ տարբերակ։",
        unableBuildGuests: "Չհաջողվեց ձևավորել հյուրերի տվյալները։",
        prebookFailed: "Չհաջողվեց նախնական ամրագրումը։",
        signInToComplete: "Խնդրում ենք մուտք գործել՝ ամրագրումը ավարտելու համար։",
        confirmPriceChange: "Խնդրում ենք հաստատել նոր գինը՝ նախքան ամրագրումը։",
        missingSessionPrebook: "Սեսիայի տվյալները բացակայում են։ Խնդրում ենք նորից նախնական ամրագրում կատարել։",
        missingDestination: "Ուղղության կոդը բացակայում է։ Խնդրում ենք նորից որոնել։",
        roomMissingRateKey: "Սենյակ {room}-ի սակագնի տվյալները բացակայում են։",
        roomMissingPrice: "Սենյակ {room}-ի գնի տվյալները բացակայում են։",
        redirectPayment: "Չհաջողվեց անցնել վճարման էջին։",
        startPaymentFailed: "Չհաջողվեց սկսել վճարումը։",
        loadHotelFailed: "Չհաջողվեց բեռնել հյուրանոցի տվյալները։",
        loadRoomOptionsFailed: "Չհաջողվեց բեռնել սենյակների տարբերակները։",
      },
    },
    gallery: {
      label: "Հյուրանոցի պատկերասրահ",
      imageAlt: "{name} — պատկեր {index}",
      closeLabel: "Փակել նկարը",
      prevLabel: "Նախորդ պատկեր",
      nextLabel: "Հաջորդ պատկեր",
    },
  },
  en: {
    nav: [
      { href: "#featured", label: "Premier Stays" },
      { href: "#offers", label: "Exclusive Offers" },
      { href: "#faq", label: "FAQ" },
    ],

    labels: {
      exclusive: "Exclusive",
    },

    hero: {
      title: "Exclusive UAE Hotel Rates — Direct from a Tour Operator",
      subtitle: "Book hotel, transfer, flights, insurance, excursions, and theme park tickets all in one place without intermediaries and hidden fees.",
      purpose:
        "Plan and book hotels, transfers, excursions, theme parks, flights, and insurance in one elegant journey — without intermediaries and without hidden costs.",
      marquee:
        " HOTELS  ✦  TRANSFERS  ✦  EXCURSIONS  ✦  THEME PARKS  ✦  FLIGHTS  ✦  INSURANCE  ✦ ",
    },
    search: {
      wherePlaceholder: "City, or hotel",
      loadingDestinations: "Loading destinations...",
      noLocations: "No destinations or hotels found",
      adultsLabel: "Adults",
      adultsShort: "Adl.",
      childrenLabel: "Children",
      childrenShort: "Chd.",
      childrenAges: "Child's Age",
      roomsLabel: "Rooms",
      roomLabel: "Room",
      datePlaceholder: "Select dates",
      submitIdle: "Search",
      submitLoading: "Searching...",
      expandSearch: "Expand search",
      collapseSearch: "Collapse search",
      unknownHotel: "Unknown hotel",
      pickOnMap: "Pick on map",
      closeMap: "Close map",
      mapLoading: "Loading map...",
      mapEmpty: "No hotels with location data available",
      mapHotelsCount: { one: "{count} hotel", other: "{count} hotels" },
      mapSelectHint: "Click a marker to select",
      errors: {
        missingLocation: "Please select a destination or hotel.",
        missingDates: "Please choose your check-in and check-out dates.",
        invalidRooms: "Your room selection has been reset due to invalid data. Please re-enter your preferences.",
        missingSession: "Search session details are missing. Please search again.",
        submit: "Unable to process your search at this time.",
      },
    },
    services: {
      title: "Curated Travel Services for a Refined Experience",
      items: [
        {
          icon: "hotel",
          title: "Hotels",
          description:
            "A hand-selected portfolio of premium hotels across the UAE, offered at exclusive tour-operator rates.",
        },
        {
          icon: "flight",
          title: "Flights",
          description:
            "Direct flight bookings to the UAE.",
        },
        {
          icon: "directions_car",
          title: "Transfers",
          description:
            "Private and shared transfers tailored to your itinerary — from luxury airport pickups to comfortable group transportation.",
        },
        {
          icon: "tour",
          title: "Excursions",
          description:
            "Carefully curated experiences, from iconic landmarks to immersive and private journeys.",
        },
        {
          icon: "attractions",
          title: "Theme Parks",
          description:
            "Priority access tickets to the UAE’s most sought-after attractions and world-class theme parks.",
        },
        {
          icon: "shield_with_heart",
          title: "Insurance",
          description:
            "Comprehensive travel insurance designed to protect every stage of your journey.",
        },
      ],
    },
    bundleSave: {
      title: "A Thoughtfully Assembled Journey — With Preferred Value",
      savings: "Save up to 30%",
      features: [
        {
          icon: "savings",
          title: "Preferred, Negotiated Rates",
          description:
            "Direct supplier agreements allow us to offer value unavailable through traditional booking platforms.",
        },
        {
          icon: "schedule",
          title: "One Booking, Fully Managed",
          description:
            "Hotels, transfers, experiences, and extras — seamlessly coordinated in a single reservation.",
        },
        {
          icon: "support_agent",
          title: "Personal Support, 24/7",
          description:
            "Dedicated assistance before departure, during your stay, and beyond.",
        },
      ],
      cta: "Build Your Bespoke Package",
    },
    packageBuilder: {
      title: "Build your package",
      subtitle: "Add services to your trip",
      toggleOpen: "Package builder",
      toggleClose: "Hide builder",
      changeHotel: "Change hotel",
      viewService: "View",
      removeTag: "Remove",
      checkoutButton: "Proceed to checkout",
      helper: "Start by selecting a hotel to unlock additional services for your package.",
      warningSelectHotel: "Please select a hotel to continue building your package.",
      sessionExpiresIn: "Session expires in",
      sessionWarningTen: "10 minutes left to complete your package payment.",
      sessionWarningFive: "5 minutes left to complete your package payment.",
      sessionExpired: "Session expired. Your package has been reset. Please select a hotel again.",
      requiredTag: "Required",
      selectedTag: "Selected",
      addTag: "Add",
      disabledTag: "Unavailable",
      serviceDisabled: "{service} is currently unavailable.",
      transfers: {
        individual: "Individual (up to 6 passengers)",
        group: "Group",
        startingFrom: "Starting from",
        selectType: "Select a transfer type to view options.",
        perCar: "Per car",
        perPax: "Per pax",
        childPolicyLabel: "Children pricing",
        childPolicyFree: {
          one: "{count} child free (0-1.99)",
          other: "{count} children free (0-1.99)",
        },
        childPolicyHalf: {
          one: "{count} child 50% off (2-11.99)",
          other: "{count} children 50% off (2-11.99)",
        },
      },
      excursions: {
        allLabel: "All Options",
        yasLabel: "Yas Island",
        countLabel: {
          one: "{count} option",
          other: "{count} options",
        },
        filterNote: "View options",
        noMatch: "No excursions match this filter.",
      },
      flights: {
        searchButton: "Search flights",
        searching: "Searching flights...",
        searchPrompt: "Search to see available flights.",
        noOptions: "No flights available for these dates.",
        loadFailed: "Failed to load flight options.",
        demoNote: "Showing demo fares until test credentials are provided.",
      },
      services: {
        hotel: "Hotel",
        flight: "Flight",
        transfer: "Transfer",
        excursion: "Excursions",
        insurance: "Insurance",
      },
      pages: {
        hotel: {
          title: "Hotel",
          body: "A hand-selected portfolio of premium hotels across the UAE, offered at exclusive tour-operator rates.",
          note: "Once your hotel is set, you can add more services.",
          cta: "Search hotels",
        },
        flight: {
          title: "Flights",
          body: "Direct flight bookings to the UAE.",
          note: "Dates and passenger counts come from your hotel search.",
          cta: "Search flights",
        },
        transfer: {
          title: "Transfers",
          body: "Private and shared transfers tailored to your itinerary — from luxury airport pickups to comfortable group transportation.",
          note: "Start with a hotel to continue your package.",
          cta: "Find a hotel",
        },
        excursion: {
          title: "Excursions and Theme Parks",
          body: "Carefully curated experiences, from iconic landmarks to immersive and private journeys.",
          note: "Start with a hotel to continue your package.",
          cta: "Find a hotel",
        },
        insurance: {
          title: "Insurance",
          body: "Comprehensive travel insurance designed to protect every stage of your journey.",
          note: "Premiums are estimated using traveler ages and update at checkout.",
          cta: "Find a hotel",
        },
      },
      insurance: {
        note: "Premiums are estimated using traveler ages and update at checkout.",
        quoteLabel: "Estimated premium",
        quoteLoading: "Calculating premium...",
        selectPlanNote: "Choose a plan to add insurance to your package.",
        coverageLabel: "Coverage: {amount}",
        territoryLabel: "Coverage territory",
        travelCountriesLabel: "Travel country",
        travelCountriesPlaceholder: "e.g. United Arab Emirates",
        defaultTravelCountry: "Արաբական Միացյալ Էմիրություն",
        startDateLabel: "Start date",
        endDateLabel: "End date",
        territories: {
          worldwideExcluding:
            "Worldwide (excluding USA, Canada, Australia, Japan, Schengen countries, United Kingdom)",
          worldwideExcludingPolicy:
            "Ամբողջ աշխարհ (բացառությամբ ԱՄՆ, Կանադա, Ավստրալիա, Ճապոնիա, Շենգենյան երկրներ, Մեծ Բրիտանիա)",
        },
        plans: {
          standard: {
            title: "Standard",
            description: "Core travel coverage from EFES.",
          },
        },
      },
      checkout: {
        title: "Checkout",
        subtitle: "Review your package and choose a payment method.",
        summaryTitle: "Selected services",
        summaryHint: "Everything in your package, summarized below.",
        emptySummary: "No services selected yet.",
        pendingDetails: "Details will be confirmed during booking.",
        contactTitle: "Contact details",
        contactHint: "Booking confirmations and updates will be sent to the contact person.",
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        phone: "Phone",
        guestTitle: "Guest details",
        guestHint: "Add the full name and age for each guest staying in the room.",
        guestEmpty: "Guest details will appear after you select a hotel room.",
        guestRoomLabel: "Room",
        guestAdultLabel: "Adult",
        guestChildLabel: "Child",
        guestLeadLabel: "Lead guest",
        ageLabel: "Age",
        billingTitle: "Billing details",
        billingHint: "Used for invoices and payment verification.",
        country: "Country",
        city: "City",
        address: "Street address",
        zip: "ZIP / Postal code",
        insuranceTitle: "Insurance details",
        insuranceHint: "Provide passport and contact details for each traveler.",
        insuranceEmpty: "Insurance travelers will appear after you select insurance.",
        insuranceTravelerLabel: "Traveler {index}",
        insuranceFields: {
          firstNameEn: "First name (Latin)",
          lastNameEn: "Last name (Latin)",
          gender: "Gender",
          genderPlaceholder: "Select",
          genderMale: "Male",
          genderFemale: "Female",
          birthDate: "Date of birth",
          passportNumber: "Passport number",
          passportAuthority: "Issuing authority",
          passportIssueDate: "Issue date",
          passportExpiryDate: "Expiry date",
          residency: "Residency",
          citizenship: "Citizenship",
          socialCard: "Social card",
          mobilePhone: "Mobile phone",
          phone: "Phone",
          email: "Email",
          address: "Registered address",
          addressEn: "Address (Latin)",
          country: "Country",
          region: "Region",
          city: "City",
        },
        couponTitle: "Coupon or gift card code",
        couponPlaceholder: "Enter code",
        applyCoupon: "Apply",
        paymentTitle: "Payment method",
        paymentHint: "Choose how you want to pay.",
        methodIdram: "Pay by Idram",
        methodCard: "Pay by credit card",
        cardName: "Cardholder name",
        cardNumber: "Card number",
        cardExpiry: "Expiry (MM/YY)",
        cardCvc: "CVC",
        termsLabel: "I agree to the",
        termsConnector: "and",
        payIdram: "Pay with Idram",
        payCard: "Pay by card",
        totalTitle: "Payment summary",
        totalLabel: "Total",
        processingNote:
          "Your payment will be processed securely. We will confirm your booking after verification.",
        errors: {
          missingHotel: "Select a hotel to continue.",
          missingDetails: "Room details are missing. Please reselect the hotel.",
          missingGuestDetails: "Please complete the guest details for all travelers.",
          insuranceDetailsRequired: "Please complete all required insurance details.",
          insuranceQuoteFailed: "Failed to calculate the insurance premium.",
          cardUnavailable: "Card payments are not available yet.",
          paymentFailed: "Failed to start payment. Please try again.",
        },
        labels: {
          destination: "Destination",
          dates: "Dates",
          rooms: "Rooms",
          guests: "Guests",
          route: "Route",
          vehicle: "Vehicle",
          price: "Price",
          type: "Type",
          hotelCode: "Hotel code",
        },
      },
    },
    trustStats: {
      title: "Chosen by Thousands of Discerning Travelers",
      stats: [
        { value: "50,000+", label: "Satisfied Guests", icon: "people" },
        { value: "4.9/5", label: "Average Rating", icon: "star" },
        { value: "24/7", label: "Dedicated Support", icon: "support_agent" },
        { value: "100%", label: "Secure Payments", icon: "security" },
      ],
    },
    exclusives: {
      offers: [
        {
          title: "Dubai",
          badge: "Most popular",
          description: "Modern city with luxury hotels, shopping, desert safari and beautiful beaches.",
          cta: "View Dubai offers",
          soon: "Coming soon",
        },
        {
          title: "Abu Dhabi",
          badge: "Culture & family",
          description: "Cultural landmarks, Yas Island, theme parks and relaxing beaches for families.",
          cta: "View Abu Dhabi offers",
          soon: "Coming soon",
        },
        {
          title: "Sharjah",
          badge: "Best value",
          description: "Cultural capital with museums, clean beaches and a calm, family-friendly atmosphere.",
          cta: "View Sharjah offers",
          soon: "Coming soon",
        },
      ],
    },
    featured: {
      title: "Distinguished Hotels with Exclusive Privileges",
      subtitle: "Transparent terms, exclusive benefits, and fast confirmation.",
      cta: "Explore Hotels Across the Emirates",
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          title: "What services can I book with Megatours?",
          body: "You can book hotels in the UAE, flights, airport transfers, excursions, travel insurance, and theme park tickets — all in one seamless platform.",
        },
        {
          title: "Are the displayed prices final?",
          body: "Yes. All prices are shown transparently before payment, with no hidden fees or unexpected charges.",
        },
        {
          title: "Can I combine multiple services into one booking?",
          body: "Absolutely. You can build a personalized travel package by combining your hotel stay with transfers, flights, insurance, excursions, and attractions.",
        },
        {
          title: "What payment options are available?",
          body: "You can pay securely via Idram or use RocketLine to spread your payment over up to 60 months.",
        },
        {
          title: "How can I contact customer support?",
          body: "Our support team is available 24/7 in Armenian, English, and Russian to assist with bookings, changes, and any inquiries.",
        },
      ],
    },
    card: {
      from: "From",
      perNight: "/ night",
      reviews: "verified reviews",
      cta: "Reserve Room",
    },
    auth: {
      checking: "Verifying...",
      signedIn: "Signed In",
      signOut: "Sign Out",
      signIn: "Sign In",
      guestInitialsFallback: "Guest",
      guestNameFallback: "Traveler",
    },
    accessibility: {
      skipToContent: "Skip to main content",
      servicesSection: "Our services",
      bundleSection: "Bundle and save",
    },
    header: {
      openMenu: "Open menu",
      closeMenu: "Close menu",
      primaryNav: "Primary navigation",
    },
    footer: {
      refundPolicy: "Refund Policy",
      securityPolicy: "Privacy Policy",
      b2bPartnership: "B2B Partnership",
      followUs: "Follow Us",
      poweredBy: '"MEGATOURS" is a project of "MEGAPROJECTS" LLC',
      copyright: "All rights reserved.",
    },
    home: {
      idram: {
        title: "Travel Now, Pay Later",
        body: "Use RocketLine and spread your payment over up to 60 months.",
        alt: "idram",
      },

      efes: {
        title: "Travel Insurance for Your Peace of Mind",
        body: "Choose reliable travel insurance to fully enjoy your trip, starting from just 300 AMD per day.",
        alt: "efes",
      },

      flydubai: {
        title: "Instant Flight Booking",
        body: "Book flydubai direct flights in just a few steps while saving time and money.",
        alt: "flydubai",
      },

      yas: {
        title: "Unforgettable Experiences at Yas Island",
        body: "Discover world-class theme parks with tickets starting from just 30,000 AMD.",
        alt: "Yas Island",
      },
    },
    payment: {
      success: {
        title: "Payment Received",
        body: "Thank you for your payment. We are currently confirming your booking.",
        note: "If you don't receive a confirmation email shortly, please contact our support team.",
        cta: "Back to Home",
      },
      failure: {
        title: "Payment Failed",
        body: "We were unable to complete your payment. Please try again or contact support for assistance.",
        cta: "Back to Home",
      },
      errors: {
        invalidBill: "Invalid bill number or booking not found.",
        unauthorized: "You do not have permission to view these booking details.",
        signInRequired: "Please sign in to view your booking details.",
      },
    },
    policies: {
      refund: {
        title: "Refund Policy",
        intro:
          "This Refund Policy governs (i) booking cancellations and modifications, (ii) refund eligibility and calculation, (iii) refund processing timelines, and (iv) dispute resolution for services booked through the Platform. The specific terms displayed at the time of booking shall prevail over this general policy in case of any discrepancy.",
        sections: [
          {
            title: "Definitions",
            items: [
              "Platform — the booking system acting as an intermediary for travel services.",
              "Booking — a reservation or purchase of accommodation and/or ancillary services (transfers, excursions, flights, insurance) made through the Platform.",
              "Service — accommodation, transfer, excursion or ticket, flight, insurance, or other travel-related service.",
              "Rate — the price of a Service together with its applicable rules (refundable or non-refundable, deadlines, penalties, etc.).",
              "Free Cancellation Period — the period during which cancellation is allowed without penalty, if provided by the applicable Rate.",
              "No-show — failure of the traveler to use the booked Service in accordance with its rules.",
              "Refund — the return of paid funds to the original payment method, subject to legal and payment provider requirements.",
            ],
          },
          {
            title: "General Provisions",
            items: [
              "By completing a booking, you confirm that you have reviewed and accepted the applicable Rate and Service rules displayed at checkout.",
              "If the specific booking terms conflict with this Policy, the booking-specific terms shall apply.",
              "Certain Rates may include non-refundable components which are not subject to refund even where cancellation is otherwise permitted.",
              "Partial cancellations or modifications may be treated as full cancellations and subject to the same penalties.",
              "Bank fees, card issuer charges, and currency exchange differences are determined by your financial institution and are not refundable.",
            ],
          },
          {
            title: "Hotel Bookings",
            items: [
              "Refunds may be permitted if cancellation is made within the Free Cancellation Period or if the selected Rate is marked as refundable.",
              "No refunds are issued for non-refundable Rates, no-shows, or cancellations made after the applicable deadline.",
              "Where permitted, refunds are calculated in accordance with the hotel’s rules and may be reduced by penalties, non-refundable fees, or the value of services already rendered.",
            ],
          },
          {
            title: "Transfers and Excursions",
            items: [
              "Transfers, excursions, tickets, and similar services are subject to their own specific terms, which may differ from hotel policies.",
              "Refunds are allowed only where expressly permitted by the applicable Service conditions.",
              "Typically, refunds are not available for late cancellations, no-shows, promotional tickets, or time-slot-based or named-entry services.",
            ],
          },
          {
            title: "Flights (flydubai)",
            items: [
              "Flight refunds, changes, name corrections, baggage rules, and no-show conditions are governed exclusively by the airline’s fare rules.",
              "You are required to review the applicable flydubai fare conditions via the link provided on the Platform prior to payment.",
              "Where permitted, refunds can be processed only after the airline has refunded the Platform, and within the limits of the selected fare.",
            ],
          },
          {
            title: "Travel Insurance",
            items: [
              "Insurance premiums are non-refundable regardless of subsequent booking cancellation, modification, or non-use.",
              "Coverage, exclusions, and claim procedures are governed solely by the insurance policy terms made available on the Platform.",
            ],
          },
          {
            title: "Requests and Processing Timelines",
            items: [
              "Cancellation or refund requests must be submitted via the cancellation link in the confirmation email or by contacting support.",
              "Initial request review is typically completed within 48 hours.",
              "Approved refunds are processed by financial institutions within approximately 5–15 business days.",
            ],
          },
          {
            title: "Disputes and Liability",
            items: [
              "In case of disagreement regarding refund eligibility or calculation, you should first contact Platform support with written justification.",
              "Initiating a chargeback may result in transaction suspension and extended review timelines.",
              "The Platform is not liable for bank fees, exchange rate differences, or limitations imposed by third-party Service providers, to the extent permitted by law.",
            ],
          },
        ],
        note:
          "Our support team is available to assist with refund and cancellation inquiries based on the specific terms applicable to each booking.",
      },
      security: {
        title: "Privacy Policy",
        intro: "Your personal data and payments are protected through modern security measures and strictly controlled access.",
        sections: [
          {
            title: "Data Protection",
            items: [
              "All data is encrypted during transmission using industry-standard protocols.",
              "Access to personal data is restricted to authorized personnel on a strict need-to-know basis.",
              "We collect only the minimum information required to process bookings and provide services.",
            ],
          },
          {
            title: "Payment Security",
            body: "Payments are processed via trusted, PCI-compliant payment providers. Card details are handled exclusively by these providers and are never stored by us.",
            items: [
              "Secure checkout environment with continuous fraud monitoring.",
              "3-D Secure or equivalent authentication where supported.",
              "Payment and booking confirmations are sent to the email address you provide.",
            ],
          },
          {
            title: "Account Protection",
            items: [
              "Secure sign-in via trusted identity providers such as Google.",
              "Automatic notifications for significant account or booking changes.",
              "Proactive review and verification in case of suspicious activity.",
            ],
          },
          {
            title: "User Security Responsibilities",
            items: [
              "Use a strong and unique password for your primary email account.",
              "Do not share verification codes, login credentials, or payment details with third parties.",
              "Always ensure you are using the official megatours.am domain.",
            ],
          },
          {
            title: "Reporting Security Issues",
            body: "If you suspect unauthorized access or a data security issue, contact our support team immediately so we can take appropriate protective measures.",
          },
        ],
        note: "We continuously enhance our security practices to protect your data and maintain your trust.",
      },
    },
    profile: {
      title: "Your Travel Dashboard",
      subtitle: "Manage all your bookings, saved searches, and trip details in one central location.",
      memberSince: "Member since",
      signIn: {
        title: "Sign in to Access Your Trips",
        body: "Log in with Google to view your bookings, search history, and personalized travel preferences.",
        cta: "Sign in with Google",
      },
      stats: {
        bookings: "Total Bookings",
        searches: "Saved Searches",
        favorites: "Favorite Hotels",
        nights: "Nights Explored",
        lastActivity: "Last Activity",
      },
      bookings: {
        title: "Your Bookings",
        subtitle: "Quickly access your confirmation details and current booking status.",
        emptyTitle: "No Bookings Yet",
        emptyBody: "Your confirmed stays will appear here, complete with all necessary reservation details.",
        status: {
          confirmed: "Confirmed",
          pending: "Processing",
          failed: "Failed",
          unknown: "Pending",
        },
        labels: {
          bookingId: "Booking ID",
          confirmation: "Confirmation",
          hotelCode: "Hotel Code",
          destination: "Destination",
          rooms: "Rooms",
          guests: "Guests",
          total: "Total",
          bookedOn: "Booked on",
        },
        viewHotel: "View Hotel",
        viewVoucher: "View voucher",
        downloadVoucher: "Download PDF",
      },
      voucher: {
        title: "Booking voucher",
        subtitle: "Keep this voucher for check-in, transfers, and excursions.",
        downloadPdf: "Download PDF",
        backToProfile: "Back to profile",
        issuedOn: "Issued on",
        paymentNote: "This voucher confirms your booking details.",
        sections: {
          stay: "Hotel stay",
          payment: "Payment summary",
          services: "Inclusions",
          guests: "Guest list",
          notes: "Important notes",
        },
        notes: "Present this voucher at check-in and during service pickup. Contact support if any details change.",
      },
      searches: {
        title: "Search History",
        subtitle: "Pick up right where you left off.",
        emptyTitle: "No Searches Yet",
        emptyBody: "Start exploring the UAE and your recent searches will be saved here for quick access.",
        labels: {
          dates: "Dates",
          results: "Results",
          rooms: "Rooms",
          guests: "Guests",
          destination: "Destination",
          hotel: "Hotel",
          searchedOn: "Searched on",
        },
        searchAgain: "Search Again",
      },
      favorites: {
        title: "Favorite Hotels",
        subtitle: "Your handpicked stays, ready for your next adventure.",
        emptyTitle: "No Favorites Yet",
        emptyBody: "Simply tap “Save” on any hotel page to keep it here for easy reference.",
        viewHotel: "View Hotel",
        locationFallback: "Location not specified",
        labels: {
          rating: "Rating",
          savedOn: "Saved on",
          code: "Hotel Code",
        },
      },
      insights: {
        title: "Travel Insights",
        subtitle: "A personalized look at your travel patterns.",
        labels: {
          topDestination: "Top Destination",
          averageStay: "Average Trip Length",
          roomsBooked: "Rooms Booked",
          lastBooking: "Last Booking",
        },
        empty: "Not enough data yet to generate insights.",
      },
      actions: {
        title: "Quick Actions",
        browse: "Browse Featured Stays",
        items: {
          newSearch: {
            title: "Start a New Search",
            body: "Discover the latest rates across the UAE’s top destinations.",
            cta: "Search Hotels",
          },
          savedTravelers: {
            title: "Saved Travelers",
            body: "Store guest details for an even faster checkout experience.",
            cta: "Coming Soon",
          },
          priceAlerts: {
            title: "Price Alerts",
            body: "Track hotel rates and get notified of the best deals.",
            cta: "Coming Soon",
          },
        },
      },
    errors: {
      title: "Unable to Load Your Data",
      body: "We’re experiencing a temporary issue. Please try again in a few minutes.",
    },
  },
  admin: {
    title: "Admin Console",
    subtitle: "Monitor every booking and activity in one place.",
    dashboard: {
      title: "Admin Dashboard",
      subtitle: "Jump into every admin area in one click.",
      navTitle: "Management Areas",
      navSubtitle: "Choose the section you want to manage.",
      open: "Open",
      cards: {
        bookings: "Review and manage every booking.",
        featured: "Curate the featured hotels carousel.",
        users: "See user profiles and recent activity.",
        searches: "Monitor recent searches across the site.",
        favorites: "Review saved hotels by users.",
        services: "Control which services are available to users.",
      },
    },
    services: {
      title: "Service Availability",
      subtitle: "Enable or disable services for users.",
      panelTitle: "Available services",
      note: "Disabled services will be inactive in the package builder.",
      saved: "Changes saved.",
      actions: {
        save: "Save changes",
        saving: "Saving...",
      },
      status: {
        enabled: "Enabled",
        disabled: "Disabled",
      },
      errors: {
        saveFailed: "Failed to save service availability.",
      },
    },
    featured: {
      title: "Featured Hotels",
      subtitle: "Curate the hotel carousel on the home page.",
      searchTitle: "Search Aoryx hotels",
      searchSubtitle: "Pick a 4+ rated hotel and configure its card details.",
      searchLabel: "Find a hotel",
      searchPlaceholder: "Search by hotel name or destination",
      loading: "Loading hotels...",
      noResults: "No hotels found",
      alreadySelected: "Already featured",
      formTitle: "Card details",
      formSubtitle: "Add pricing and localized badge/availability.",
      emptyTitle: "Select a hotel to start",
      emptyBody: "Pick a hotel from the search results to edit its card.",
      fields: {
        priceFrom: "Rate",
        oldPrice: "Old price",
        badge: "Badge text",
        availability: "Availability",
        amenities: "Amenities",
        selected: "selected",
      },
      previewLabel: "Live preview",
      listTitle: "Featured hotels list",
      listSubtitle: "Manage hotels shown in the home marquee.",
      listEmptyTitle: "No featured hotels yet",
      listEmptyBody: "Add your first hotel from the search list.",
      actions: {
        save: "Save hotel",
        saving: "Saving...",
        edit: "Edit",
        remove: "Remove",
        removing: "Removing...",
        clear: "Clear",
      },
      validation: {
        selectHotel: "Select a hotel first.",
        priceFrom: "Enter a rate greater than 0.",
        oldPrice: "Enter an old price greater than 0.",
        amenities: "Select exactly 3 amenities.",
        amenitiesLimit: "You can select up to 3 amenities.",
        translations: "Provide badge and availability for all languages.",
      },
      errors: {
        saveFailed: "Failed to save hotel.",
        removeFailed: "Failed to remove hotel.",
      },
    },
    users: {
      title: "Users",
      subtitle: "Latest user profiles and activity snapshots.",
      emptyTitle: "No users found",
      emptyBody: "There are no user records yet.",
      stats: {
        total: "Total users",
      },
      columns: {
        user: "User",
        email: "Email",
        lastLogin: "Last login",
        lastSearch: "Last search",
        lastBooking: "Last booking",
        createdAt: "Created",
      },
    },
    searches: {
      title: "Searches",
      subtitle: "Recent search activity across the site.",
      emptyTitle: "No searches found",
      emptyBody: "There are no search records yet.",
      columns: {
        user: "User",
        destination: "Destination",
        hotel: "Hotel",
        dates: "Dates",
        rooms: "Rooms",
        guests: "Guests",
        createdAt: "Created",
      },
    },
    favorites: {
      title: "Favorites",
      subtitle: "Saved hotels by users.",
      emptyTitle: "No favorites found",
      emptyBody: "There are no saved hotels yet.",
      columns: {
        user: "User",
        hotel: "Hotel",
        location: "Location",
        rating: "Rating",
        savedAt: "Saved on",
      },
    },
    bookings: {
      title: "All bookings",
      subtitle: "Filter by hotel, user, status, or source.",
      emptyTitle: "No bookings found",
      emptyBody: "Try adjusting your filters or search terms.",
    },
    filters: {
      searchPlaceholder: "Search hotel, booking ID, email...",
      statusLabel: "Status",
      sourceLabel: "Source",
      sortLabel: "Sort by",
      reset: "Reset",
      all: "All",
      sortOptions: {
        newest: "Newest first",
        oldest: "Oldest first",
        totalHigh: "Total: High to Low",
        totalLow: "Total: Low to High",
      },
    },
    columns: {
      bookingId: "Booking ID",
      hotel: "Hotel",
      user: "User",
      dates: "Dates",
      guests: "Guests",
      total: "Total",
      status: "Status",
      createdAt: "Created",
      source: "Source",
      actions: "Details",
    },
    stats: {
      totalBookings: "Total bookings",
      totalGuests: "Total guests",
      confirmed: "Confirmed",
      pending: "Pending",
      failed: "Failed",
      unknown: "Unknown",
    },
    access: {
      signInTitle: "Sign in to access the admin panel",
      signInBody: "Admin access is restricted. Please sign in to continue.",
      signInCta: "Sign in with Google",
      deniedTitle: "Access restricted",
      deniedBody: "This page is available to admin users only.",
      configTitle: "Admin access not configured",
      configBody: "Set ADMIN_EMAILS (or ADMIN_USER_IDS/ADMIN_EMAIL_DOMAINS) to enable access.",
    },
    actions: {
      details: "Details",
    },
    details: {
      payload: "Payload",
      booking: "Booking result",
    },
  },
  results: {
      filters: {
        button: "Filters",
        openLabel: "Open filters",
        closeLabel: "Close filters",
        title: "Filters",
        priceRange: "Price Range",
        rating: "Rating",
        noPricing: "No pricing data available.",
      },
      loading: "Searching for available options...",
      errorAlt: "Error",
      emptyAlt: "No options found",
      emptyMessage: "No options matched your search criteria. Try adjusting your dates or destination.",
      fallbackTitle: "Search Results",
      placesFound: {
        one: "{count} property found",
        other: "{count} properties found",
      },
      sortLabel: "Sort by",
      sortOptions: {
        priceAsc: "Price: Low to High",
        priceDesc: "Price: High to Low",
        ratingDesc: "Rating: High to Low",
        ratingAsc: "Rating: Low to High",
      },
      hotel: {
        fallbackName: "Hotel",
        unnamed: "Unnamed Hotel",
        locationFallback: "UAE",
      },
      viewOptions: "View Options",
      errors: {
        missingSearchDetails: "Search details are missing. Please try again.",
        loadFailed: "We’re unable to load results at this time.",
      },
    },
    common: {
      backToSearch: "Back to Search",
      scrollTop: "Scroll to top",
      contact: "Contact",
      contactForRates: "For rate inquiries, please contact us.",
      close: "Close",
      yes: "Yes",
      no: "No",
      total: "Total",
      status: "Status",
      night: {
        one: "{count} night",
        other: "{count} nights",
      },
    },
    hotel: {
      favorites: {
        save: "Save to Favorites",
        saved: "Saved",
        saving: "Saving...",
        signIn: "Sign in to save",
      },
      addons: {
        title: "Package Builder",
        subtitle: "Add transfers, excursions, insurance, and flights in a few taps.",
        badge: "Optional Add-ons",
        actions: {
          add: "Add",
          remove: "Remove",
        },
        status: {
          optional: "Optional",
          requested: "Requested",
        },
        summary: {
          rooms: "Rooms",
          transfers: "Transfers",
          excursions: "Excursions",
          insurance: "Insurance",
          flights: "Flights",
          requested: "Requested",
        },
        transfers: {
          title: "Transfers",
          description: "Airport pick-ups and city rides tailored to your stay.",
          panelTitle: "Transfer Options",
          airportLabel: "Airport",
          paxLabel: "pax",
          bagsLabel: "bags",
          includeReturn: "Include return transfer",
          returnTotal: "Return total",
          oneWayTotal: "One-way total",
          perPax: "Per pax",
          perVehicle: "Per vehicle",
          bothWays: "Both directions",
          flightNumber: "Flight number",
          arrivalDate: "Arrival date & time",
          vehicleQty: "Vehicle quantity",
          loading: "Loading transfer options...",
          noOptions: "No transfer options available for this destination.",
          missingDestination: "Select a destination to see transfer options.",
          loadFailed: "Unable to load transfer options.",
          selectRequired: "Please select a transfer option or turn off transfers.",
          detailsRequired: "Please add flight details for your transfer.",
          flightNumberRequired: "Flight number is required.",
          arrivalRequired: "Arrival date and time are required.",
        },
        excursions: {
          title: "Excursions",
          description: "Handpicked experiences to personalize your trip.",
          panelTitle: "Excursion Options",
          adultsLabel: "Adults",
          childrenLabel: "Children",
          feeNote: "Prices include service fees.",
          loading: "Loading excursion options...",
          noOptions: "No excursion options available right now.",
          loadFailed: "Unable to load excursion options.",
          unnamed: "Excursion",
          adultPrice: "Adult",
          childPrice: "Child",
          totalLabel: "Total",
          applyAll: "Apply to all guests",
        },
        insurance: {
          title: "Insurance",
          description: "Stay protected with travel insurance add-ons.",
          panelTitle: "Choose an insurance plan",
          noteLabel: "Special requests (optional)",
          notePlaceholder: "Let us know any coverage preferences.",
          plans: {
            essential: {
              title: "Essential",
              description: "Medical coverage and trip cancellation basics.",
            },
            complete: {
              title: "Complete",
              description: "Extended coverage for delays, baggage, and more.",
              highlight: "Recommended",
            },
            premium: {
              title: "Premium",
              description: "Comprehensive protection with higher limits.",
            },
          },
        },
        flights: {
          title: "Flights",
          description: "Share your route and we will source the best fares.",
          panelTitle: "Flight request",
          originLabel: "From",
          destinationLabel: "To",
          departureLabel: "Departure date",
          returnLabel: "Return date",
          cabinLabel: "Cabin class",
          cabinPlaceholder: "Select cabin",
          notesLabel: "Notes",
          notesPlaceholder: "Preferred airlines, flexibility, or other requests.",
          cabin: {
            economy: "Economy",
            premium: "Premium Economy",
            business: "Business",
            first: "First",
          },
        },
      },
      map: {
        viewAria: "View hotel location on map",
        showButton: "Show Location on Map",
        title: "Hotel Location",
        iframeTitle: "Google Maps - Hotel Location",
        ariaLabel: "Interactive hotel map",
        closeLabel: "Close map",
      },
      amenities: {
        title: "Hotel Amenities",
        showLess: "Show less",
        showAll: "Show all amenities",
      },
      searchTitle: "Plan your next extraordinary escape.",
      roomOptions: {
        loading: "Loading the best room options...",
        empty: "No room options are currently available for these dates.",
        noMatch: "No room options match your selected filters.",
        count: {
          one: "{count} room option found",
          other: "{count} room options found",
        },
        of: "of {total}",
        filterMeal: "Meal Plan",
        filterPrice: "Price",
        allMeals: "All meal plans",
        recommended: "Recommended",
        lowestPrice: "Lowest Price",
        highestPrice: "Highest Price",
        roomOptionFallback: "Room Option",
        mealPlans: {
          roomOnly: "Room Only",
          breakfast: "Breakfast",
          halfBoard: "Half Board",
          fullBoard: "Full Board",
          allInclusive: "All Inclusive",
          ultraAllInclusive: "Ultra All Inclusive",
        },
        refundable: "Refundable",
        nonRefundable: "Non-Refundable",
        roomsLeft: {
          one: "{count} room remaining",
          other: "{count} rooms remaining",
        },
        roomBreakdown: "Room {index}: {price}",
        signInToBook: "Sign in to book",
        checkingAvailability: "Verifying availability...",
        bookNow: "Book Now",
      },
      booking: {
        titleFallback: "Guest Details",
        successMessage: "Your booking request has been submitted successfully.",
        confirmationNumberLabel: "Confirmation Number",
        priceChangeWarning: "The price has updated during verification. Please review and confirm the new rate to proceed.",
        priceChangeConfirm: "I accept the updated price and wish to proceed with the booking.",
        resetPackageWarning: "Changing the already selected option will reset your package selections.",
        resetPackageConfirm: "I understand — reset my package selections.",
        titles: {
          mr: "Mr.",
          ms: "Ms.",
          mrs: "Mrs.",
          master: "Master",
        },
        firstNamePlaceholder: "First Name",
        lastNamePlaceholder: "Last Name",
        mealPlanLabel: "Meal Plan",
        rateTypeLabel: "Rate Type",
        bedTypeSingle: "Bed Type",
        bedTypePlural: "Bed Types",
        inclusionsLabel: "What's Included",
        cancellationPolicyTitle: "Cancellation Policy",
        noPenaltyDetails: "No specific penalty details are available.",
        remarksTitle: "Important Remarks",
        additionalInfo: "Additional Information",
        roomPriceLabel: "Room Price",
        paymentNote: "You will be securely redirected to Idram to complete your payment.",
        redirectingToIdram: "Redirecting to Idram...",
        payWithIdram: "Pay with Idram",
        selectRoom: "Select this option",
        closeBookingAria: "Close booking",
      },
      policy: {
        freeCancellation: "Free Cancellation",
        from: "From",
        until: "until",
      },
      remarks: {
        types: {
          mandatory: "Mandatory",
          mandatoryTax: "Mandatory Tax",
          mandatoryFee: "Mandatory Fee",
          mandatoryCharge: "Mandatory Charge",
          optional: "Optional",
          knowBeforeYouGo: "Know Before You Go",
          disclaimer: "Disclaimer",
          note: "Note",
        },
        defaultLabel: "Information",
      },
      policies: {
        types: {
          cancellation: "Cancellation",
          noShow: "No Show",
          modification: "Modification",
        },
        defaultLabel: "Policy",
      },
      errors: {
        roomNeedsAdult: "Room {room} must include at least one adult guest.",
        missingGuestNames: "Please provide both first and last names for all guests.",
        invalidGuestAges: "Guest ages must be entered as valid numbers.",
        invalidChildAge: "Child ages must be between 0 and 17 years.",
        invalidAdultAge: "Adult guests must be 18 years of age or older.",
        checkingSignIn: "Verifying your sign-in status. Please wait a moment.",
        signInToBook: "Please sign in to complete your booking for this room.",
        missingSession: "Session details are missing. Please restart your search.",
        cannotBookOption: "This room option is currently unavailable. Please select another option.",
        missingRateKeys: "Rate keys are missing for this option. Please try another selection.",
        unableBuildGuests: "We were unable to process guest details for this selection.",
        prebookFailed: "Failed to pre-book the selected rate.",
        signInToComplete: "Please sign in to complete your booking.",
        confirmPriceChange: "Please confirm the updated price before finalizing your booking.",
        missingSessionPrebook: "Session details are missing. Please restart the pre-booking process.",
        missingDestination: "The destination code is missing. Please perform your search again.",
        roomMissingRateKey: "Rate information is missing for Room {room}.",
        roomMissingPrice: "Price details are missing for Room {room}.",
        redirectPayment: "Unable to redirect to the payment gateway.",
        startPaymentFailed: "Failed to initiate the payment process.",
        loadHotelFailed: "We are unable to load this hotel's details right now.",
        loadRoomOptionsFailed: "Unable to load available room options.",
      },
    },
    gallery: {
      label: "Hotel Gallery",
      imageAlt: "{name} — View {index}",
      closeLabel: "Close full screen image",
      prevLabel: "Previous image",
      nextLabel: "Next image",
    },
  },
  ru: {
    nav: [
      { href: "#featured", label: "Подборка отелей" },
      { href: "#offers", label: "Специальные предложения" },
      { href: "#faq", label: "ЧЗВ" },
    ],
    labels: { exclusive: "Эксклюзив" },
    hero: {
      title: "Эксклюзивные цены на отели ОАЭ — напрямую от туроператора",
      subtitle:
        "Бронируйте отел, трансфер, авиабилеты, страховку, экскурсии и билеты в тематические парки в одном месте без посредников и скрытых комиссий.",
      purpose:
        "Отели, трансферы, экскурсии, тематические парки, авиабилеты и страховка — в одном продуманном бронировании, без посредников и скрытых условий.",
      marquee:
        " ОТЕЛИ  ✦  ТРАНСФЕРЫ  ✦  ЭКСКУРСИИ  ✦  ТЕМАТИЧЕСКИЕ ПАРКИ  ✦  АВИАБИЛЕТЫ  ✦  СТРАХОВКА  ✦ ",
    },
    search: {
      wherePlaceholder: "Город, или отель",
      loadingDestinations: "Загрузка направлений...",
      noLocations: "Направления или отели не найдены",
      adultsLabel: "Взрослые",
      adultsShort: "Взр.",
      childrenLabel: "Дети",
      childrenShort: "Дет.",
      childrenAges: "Возраст ребенка",
      roomsLabel: "Номера",
      roomLabel: "Номер",
      datePlaceholder: "Выберите даты",
      submitIdle: "Поиск",
      submitLoading: "Ищем...",
      expandSearch: "Развернуть поиск",
      collapseSearch: "Свернуть поиск",
      unknownHotel: "Неизвестный отель",
      pickOnMap: "Выбрать на карте",
      closeMap: "Закрыть карту",
      mapLoading: "Загрузка карты...",
      mapEmpty: "Нет отелей с данными о местоположении",
      mapHotelsCount: { one: "{count} отель", few: "{count} отеля", many: "{count} отелей", other: "{count} отеля" },
      mapSelectHint: "Нажмите на маркер, чтобы выбрать",
      errors: {
        missingLocation: "Пожалуйста, выберите направление или отель.",
        missingDates: "Пожалуйста, выберите даты заезда и выезда.",
        invalidRooms: "Ваш выбор номеров был сброшен из-за некорректных данных. Пожалуйста, укажите предпочтения заново.",
        missingSession: "Данные поисковой сессии отсутствуют. Пожалуйста, повторите поиск.",
        submit: "Не удалось отправить поиск.",
      },
    },
    services: {
      title: "Продуманные сервисы для безупречного путешествия",
      items: [
        {
          icon: "hotel",
          title: "Отели",
          description:
            "Тщательно отобранные отели по всему ОАЭ с эксклюзивными тарифами туроператора.",
        },
        {
          icon: "flight",
          title: "Авиабилеты",
          description:
            "Прямое бронирование авиабилетов в ОАЭ.",
        },
        {
          icon: "directions_car",
          title: "Трансферы",
          description:
            "Индивидуальные и групповые трансферы — от премиальных встреч в аэропорту до комфортных поездок по городу.",
        },
        {
          icon: "tour",
          title: "Экскурсии",
          description:
            "Кураторская подборка впечатлений — от знаковых достопримечательностей до приватных маршрутов.",
        },
        {
          icon: "attractions",
          title: "Тематические парки",
          description:
            "Приоритетный доступ к самым востребованным паркам и аттракционам ОАЭ.",
        },
        {
          icon: "shield_with_heart",
          title: "Страхование",
          description:
            "Комплексные страховые решения для спокойного и защищенного путешествия.",
        },
      ],
    },
    bundleSave: {
      title: "Единое путешествие — с привилегированной выгодой",
      savings: "Экономия до 30%",
      features: [
        {
          icon: "savings",
          title: "Согласованные привилегированные тарифы",
          description:
            "Прямые договоренности с поставщиками позволяют предложить условия, недоступные на обычных платформах.",
        },
        {
          icon: "schedule",
          title: "Одно бронирование — полный контроль",
          description:
            "Отели, трансферы и впечатления объединены в одной, профессионально управляемой заявке.",
        },
        {
          icon: "support_agent",
          title: "Персональная поддержка 24/7",
          description:
            "Сопровождение до поездки, во время отдыха и после возвращения.",
        },
      ],
      cta: "Собрать индивидуальный пакет",
    },
    packageBuilder: {
      title: "Соберите пакет",
      subtitle: "Добавьте услуги к поездке",
      toggleOpen: "Конструктор пакета",
      toggleClose: "Скрыть",
      changeHotel: "Сменить отель",
      viewService: "Открыть",
      removeTag: "Удалить",
      checkoutButton: "Перейти к оплате",
      helper: "Сначала выберите отель, чтобы начать сборку пакета с дополнительными опциями.",
      warningSelectHotel: "Пожалуйста, выберите отель, чтобы продолжить сборку пакета.",
      sessionExpiresIn: "Сессия истекает через",
      sessionWarningTen: "Осталось 10 минут, чтобы завершить оплату пакета.",
      sessionWarningFive: "Осталось 5 минут, чтобы завершить оплату пакета.",
      sessionExpired: "Сессия истекла. Пакет сброшен. Пожалуйста, выберите отель снова.",
      requiredTag: "Обязательно",
      selectedTag: "Выбрано",
      addTag: "Добавить",
      disabledTag: "Недоступно",
      serviceDisabled: "Услуга \"{service}\" временно недоступна.",
      transfers: {
        individual: "Индивидуальный (до 6 пассажиров)",
        group: "Групповой",
        startingFrom: "От",
        selectType: "Выберите тип трансфера, чтобы увидеть варианты.",
        perCar: "За автомобиль",
        perPax: "За пассажира",
        childPolicyLabel: "Детские тарифы",
        childPolicyFree: {
          one: "{count} ребенок бесплатно (0-1.99)",
          few: "{count} ребенка бесплатно (0-1.99)",
          many: "{count} детей бесплатно (0-1.99)",
          other: "{count} ребенка бесплатно (0-1.99)",
        },
        childPolicyHalf: {
          one: "{count} ребенок со скидкой 50% (2-11.99)",
          few: "{count} ребенка со скидкой 50% (2-11.99)",
          many: "{count} детей со скидкой 50% (2-11.99)",
          other: "{count} ребенка со скидкой 50% (2-11.99)",
        },
      },
      excursions: {
        allLabel: "Все варианты",
        yasLabel: "Yas Island",
        countLabel: {
          one: "{count} вариант",
          few: "{count} варианта",
          many: "{count} вариантов",
          other: "{count} вариантов",
        },
        filterNote: "Посмотреть варианты",
        noMatch: "Нет экскурсий для выбранного фильтра.",
      },
      flights: {
        searchButton: "Искать рейсы",
        searching: "Ищем рейсы...",
        searchPrompt: "Выполните поиск, чтобы увидеть доступные рейсы.",
        noOptions: "Нет доступных рейсов на эти даты.",
        loadFailed: "Не удалось загрузить рейсы.",
        demoNote: "Показаны демо-тарифы до получения тестовых данных.",
      },
      services: {
        hotel: "Отель",
        flight: "Авиабилеты",
        transfer: "Трансфер",
        excursion: "Экскурсии",
        insurance: "Страхование",
      },
      pages: {
        hotel: {
          title: "Отель",
          body: "Тщательно отобранные отели по всему ОАЭ с эксклюзивными тарифами туроператора.",
          note: "После выбора отеля можно добавить другие услуги.",
          cta: "Найти отель",
        },
        flight: {
          title: "Авиабилеты",
          body: "Прямое бронирование авиабилетов в ОАЭ.",
          note: "Даты и количество пассажиров берутся из поиска отеля.",
          cta: "Искать рейсы",
        },
        transfer: {
          title: "Трансферы",
          body: "Индивидуальные и групповые трансферы — от премиальных встреч в аэропорту до комфортных поездок по городу.",
          note: "Начните с выбора отеля, чтобы продолжить.",
          cta: "Найти отель",
        },
        excursion: {
          title: "Экскурсии и тематические парки",
          body: "Кураторская подборка впечатлений — от знаковых достопримечательностей до приватных маршрутов.",
          note: "Начните с выбора отеля, чтобы продолжить.",
          cta: "Найти отель",
        },
        insurance: {
          title: "Страховка",
          body: "Комплексное туристическое страхование, разработанное для защиты на каждом этапе вашего путешествия.",
          note: "Стоимость рассчитывается по возрасту путешественников и обновляется при оплате.",
          cta: "Найти отель",
        },
      },
      insurance: {
        note: "Стоимость рассчитывается по возрасту путешественников и обновляется при оплате.",
        quoteLabel: "Ориентировочная стоимость",
        quoteLoading: "Рассчитываем стоимость...",
        selectPlanNote: "Выберите план, чтобы добавить страховку в пакет.",
        coverageLabel: "Покрытие: {amount}",
        territoryLabel: "Территория покрытия",
        travelCountriesLabel: "Страна поездки",
        travelCountriesPlaceholder: "например, Объединенные Арабские Эмираты",
        defaultTravelCountry: "Արաբական Միացյալ Էմիրություն",
        startDateLabel: "Дата начала",
        endDateLabel: "Дата окончания",
        territories: {
          worldwideExcluding:
            "Весь мир (кроме США, Канады, Австралии, Японии, стран Шенгена, Великобритании)",
          worldwideExcludingPolicy:
            "Ամբողջ աշխարհ (բացառությամբ ԱՄՆ, Կանադա, Ավստրալիա, Ճապոնիա, Շենգենյան երկրներ, Մեծ Բրիտանիա)",
        },
        plans: {
          standard: {
            title: "Стандарт",
            description: "Базовое туристическое покрытие от EFES.",
          },
        },
      },
      checkout: {
        title: "Оплата",
        subtitle: "Проверьте пакет и выберите способ оплаты.",
        summaryTitle: "Выбранные услуги",
        summaryHint: "Все выбранные услуги собраны ниже.",
        emptySummary: "Пока нет выбранных услуг.",
        pendingDetails: "Детали будут подтверждены во время бронирования.",
        contactTitle: "Контактные данные",
        contactHint: "Подтверждения и обновления будут отправлены контактному лицу.",
        firstName: "Имя",
        lastName: "Фамилия",
        email: "Эл. почта",
        phone: "Телефон",
        guestTitle: "Данные гостей",
        guestHint: "Укажите имя, фамилию и возраст каждого гостя.",
        guestEmpty: "Данные гостей появятся после выбора номера.",
        guestRoomLabel: "Номер",
        guestAdultLabel: "Взрослый",
        guestChildLabel: "Ребенок",
        guestLeadLabel: "Главный гость",
        ageLabel: "Возраст",
        billingTitle: "Платежные данные",
        billingHint: "Используется для счетов и проверки платежа.",
        country: "Страна",
        city: "Город",
        address: "Адрес",
        zip: "Индекс",
        insuranceTitle: "Данные страховки",
        insuranceHint: "Укажите паспортные и контактные данные каждого путешественника.",
        insuranceEmpty: "Путешественники для страховки появятся после выбора страховки.",
        insuranceTravelerLabel: "Путешественник {index}",
        insuranceFields: {
          firstNameEn: "Имя (латиница)",
          lastNameEn: "Фамилия (латиница)",
          gender: "Пол",
          genderPlaceholder: "Выберите",
          genderMale: "Мужской",
          genderFemale: "Женский",
          birthDate: "Дата рождения",
          passportNumber: "Номер паспорта",
          passportAuthority: "Кем выдан",
          passportIssueDate: "Дата выдачи",
          passportExpiryDate: "Срок действия",
          residency: "Резидент",
          citizenship: "Гражданство",
          socialCard: "Соц. карта",
          mobilePhone: "Мобильный телефон",
          phone: "Телефон",
          email: "Эл. почта",
          address: "Адрес регистрации",
          addressEn: "Адрес (латиница)",
          country: "Страна",
          region: "Регион",
          city: "Город",
        },
        couponTitle: "Код купона или подарочной карты",
        couponPlaceholder: "Введите код",
        applyCoupon: "Применить",
        paymentTitle: "Способ оплаты",
        paymentHint: "Выберите удобный способ оплаты.",
        methodIdram: "Оплата через Idram",
        methodCard: "Оплата картой",
        cardName: "Имя на карте",
        cardNumber: "Номер карты",
        cardExpiry: "Срок действия (MM/YY)",
        cardCvc: "CVC",
        termsLabel: "Я соглашаюсь с",
        termsConnector: "и",
        payIdram: "Оплатить через Idram",
        payCard: "Оплатить картой",
        totalTitle: "Сумма к оплате",
        totalLabel: "Итого",
        processingNote:
          "Платеж обрабатывается в защищенной среде. Бронирование подтвердим после проверки.",
        errors: {
          missingHotel: "Выберите отель, чтобы продолжить.",
          missingDetails: "Данные по номерам отсутствуют. Пожалуйста, выберите отель заново.",
          missingGuestDetails: "Пожалуйста, заполните данные всех гостей.",
          insuranceDetailsRequired: "Пожалуйста, заполните все обязательные данные страховки.",
          insuranceQuoteFailed: "Не удалось рассчитать стоимость страховки.",
          cardUnavailable: "Оплата картой пока недоступна.",
          paymentFailed: "Не удалось начать оплату. Пожалуйста, попробуйте снова.",
        },
        labels: {
          destination: "Направление",
          dates: "Даты",
          rooms: "Номера",
          guests: "Гости",
          route: "Маршрут",
          vehicle: "Авто",
          price: "Цена",
          type: "Тип",
          hotelCode: "Код отеля",
        },
      },
    },
    trustStats: {
      title: "Выбор взыскательных путешественников",
      stats: [
        { value: "50,000+", label: "Довольных гостей", icon: "people" },
        { value: "4.9/5", label: "Средняя оценка", icon: "star" },
        { value: "24/7", label: "Поддержка", icon: "support_agent" },
        { value: "100%", label: "Безопасные платежи", icon: "security" },
      ],
    },
    exclusives: {
      offers: [
        {
          title: "Дубай",
          badge: "Самое популярное",
          description: "Современный город, люксовые отели, шопинг, сафари и красивые пляжи.",
          cta: "Посмотреть предложения Дубая",
          soon: "Скоро",
        },
        {
          title: "Абу-Даби",
          badge: "Культура и семья",
          description: "Культурные достопримечательности, Yas Island, парки развлечений и пляжи.",
          cta: "Посмотреть предложения Абу-Даби",
          soon: "Скоро",
        },
        {
          title: "Шарджа",
          badge: "Лучшее соотношение цены",
          description: "Культурная столица с музеями, чистыми пляжами и спокойной атмосферой.",
          cta: "Посмотреть предложения Шарджи",
          soon: "Скоро",
        },
      ],
    },
    featured: {
      title: "Отели с эксклюзивными привилегиями",
      subtitle: "Прозрачные условия, эксклюзивные преимущества и быстрое подтверждение.",
      cta: "Открыть отели по всем эмиратам",
    },
    faq: {
      title: "Часто задаваемые вопросы",
      items: [
        {
          title: "Какие услуги доступны на Megatours?",
          body: "На Megatours вы можете забронировать отели в ОАЭ, авиабилеты, аэропортовые трансферы, экскурсии, туристическую страховку и билеты в тематические парки — на одной платформе.",
        },
        {
          title: "Являются ли указанные цены окончательными?",
          body: "Да. Все цены отображаются прозрачно до оплаты — без скрытых комиссий и дополнительных платежей.",
        },
        {
          title: "Можно ли объединить несколько услуг в одном бронировании?",
          body: "Да. Вы можете собрать индивидуальный пакет, объединив проживание в отеле с трансферами, авиабилетами, страховкой, экскурсиями и развлечениями.",
        },
        {
          title: "Какие способы оплаты доступны?",
          body: "Вы можете оплатить бронирование через Idram или воспользоваться RocketLine и распределить оплату на срок до 60 месяцев.",
        },
        {
          title: "Как связаться со службой поддержки?",
          body: "Наша служба поддержки доступна 24/7 на армянском, русском и английском языках и готова помочь с бронированиями, изменениями и любыми вопросами.",
        },
      ],
    },
    card: {
      from: "От",
      perNight: "/ ночь",
      reviews: "проверенных отзывов",
      cta: "Забронировать",
    },
    auth: {
      checking: "Проверка...",
      signedIn: "Вы вошли",
      signOut: "Выйти",
      signIn: "Войти",
      guestInitialsFallback: "Гость",
      guestNameFallback: "Путешественник",
    },
    accessibility: {
      skipToContent: "Перейти к основному контенту",
      servicesSection: "Раздел наших услуг",
      bundleSection: "Раздел пакетных предложений",
    },
    header: {
      openMenu: "Открыть меню",
      closeMenu: "Закрыть меню",
      primaryNav: "Основная навигация",
    },
    footer: {
      refundPolicy: "Политика возврата",
      securityPolicy: "Политика конфиденциальности",
      b2bPartnership: "B2B сотрудничество",
      followUs: "Следите за нами",
      poweredBy: '"MEGATOURS" — проект "МЕГАПРОДЖЕКТС" ООО',
      copyright: "Все права защищены.",
    },
    home: {
      idram: {
        title: "Путешествуйте сейчас — платите позже",
        body: "Воспользуйтесь RocketLine и распределите оплату на срок до 60 месяцев.",
        alt: "idram",
      },

      efes: {
        title: "Туристическая страховка для вашего спокойствия",
        body: "Выберите надежную туристическую страховку и наслаждайтесь поездкой — от 300 драмов в день.",
        alt: "efes",
      },

      flydubai: {
        title: "Мгновенное бронирование авиабилетов",
        body: "Бронируйте прямые рейсы flydubai всего за несколько шагов, экономя время и деньги.",
        alt: "flydubai",
      },

      yas: {
        title: "Незабываемые впечатления на Yas Island",
        body: "Откройте для себя лучшие тематические парки мира — билеты от 30 000 драмов.",
        alt: "Yas Island",
      },
    },
    payment: {
      success: {
        title: "Платеж получен",
        body: "Спасибо за оплату. Мы подтверждаем ваше бронирование.",
        note: "Если подтверждение не придет в ближайшее время, свяжитесь с поддержкой.",
        cta: "На главную",
      },
      failure: {
        title: "Платеж не прошел",
        body: "Не удалось завершить оплату. Попробуйте еще раз или свяжитесь с поддержкой.",
        cta: "На главную",
      },
      errors: {
        invalidBill: "Неверный номер счета или бронирование не найдено.",
        unauthorized: "У вас нет разрешения на просмотр деталей этого бронирования.",
        signInRequired: "Пожалуйста, войдите, чтобы просмотреть детали вашего бронирования.",
      },
    },
    policies: {
     refund: {
        title: "Политика возврата",
        intro:
          "Настоящая Политика возврата регулирует (i) отмену и изменение бронирований, (ii) условия и расчет возвратов, (iii) сроки обработки возвратов, а также (iv) порядок разрешения споров по услугам, забронированным через Платформу. Конкретные условия, отображаемые при бронировании, имеют приоритет над настоящей политикой.",
        sections: [
          {
            title: "Определения",
            items: [
              "Платформа — система бронирования, действующая в качестве посредника туристических услуг.",
              "Бронирование — резервирование или покупка размещения и/или дополнительных услуг (трансферы, экскурсии, авиабилеты, страхование) через Платформу.",
              "Услуга — размещение, трансфер, экскурсия или билет, авиабилет, страхование либо иная туристическая услуга.",
              "Тариф — стоимость Услуги и применимые к ней правила (возвратный или невозвратный, сроки, штрафы и т.д.).",
              "Период бесплатной отмены — срок, в течение которого отмена возможна без штрафа, если это предусмотрено тарифом.",
              "No-show — неявка туриста для получения Услуги в соответствии с ее правилами.",
              "Возврат — возврат оплаченных средств на исходный способ оплаты с учетом требований закона и платежных систем.",
            ],
          },
          {
            title: "Общие положения",
            items: [
              "Оформляя бронирование, вы подтверждаете, что ознакомились и приняли условия тарифа и услуги, указанные при оплате.",
              "В случае расхождений применяются условия конкретного бронирования.",
              "Некоторые тарифы могут включать невозвратные элементы, которые не подлежат возврату даже при допустимой отмене.",
              "Частичная отмена или изменение могут рассматриваться как полная отмена с применением соответствующих штрафов.",
              "Банковские комиссии и курсовые разницы определяются финансовым учреждением и не подлежат компенсации.",
            ],
          },
          {
            title: "Бронирование отелей",
            items: [
              "Возврат возможен при отмене в период бесплатной отмены или при выборе возвратного тарифа.",
              "Возврат не производится при невозвратных тарифах, no-show или отмене после дедлайна.",
              "Допустимые возвраты рассчитываются по правилам отеля и могут быть уменьшены на сумму штрафов или фактически оказанных услуг.",
            ],
          },
          {
            title: "Трансферы и экскурсии",
            items: [
              "Трансферы, экскурсии и билеты регулируются собственными правилами, отличающимися от гостиничных условий.",
              "Возврат допускается только при прямом разрешении условиями соответствующей услуги.",
              "Как правило, возврат невозможен при поздней отмене, no-show, акционных билетах или услугах с фиксированным временем.",
            ],
          },
          {
            title: "Авиабилеты (flydubai)",
            items: [
              "Возвраты и изменения авиабилетов регулируются исключительно тарифными правилами авиакомпании.",
              "До оплаты вы обязаны ознакомиться с условиями flydubai по ссылке, размещенной на Платформе.",
              "Возврат возможен только после получения средств от авиакомпании и в рамках выбранного тарифа.",
            ],
          },
          {
            title: "Туристическое страхование",
            items: [
              "Страховые взносы не подлежат возврату независимо от последующих изменений или отмены бронирования.",
              "Условия покрытия и порядок урегулирования требований регулируются страховым договором.",
            ],
          },
          {
            title: "Порядок обращений и сроки",
            items: [
              "Запросы на отмену или возврат подаются через ссылку в письме подтверждения или через службу поддержки.",
              "Предварительное рассмотрение запросов обычно занимает до 48 часов.",
              "Фактический возврат средств банками занимает в среднем 5–15 рабочих дней.",
            ],
          },
          {
            title: "Споры и ответственность",
            items: [
              "При несогласии с расчетом возврата рекомендуется в первую очередь обратиться в службу поддержки в письменной форме.",
              "Инициирование chargeback может привести к блокировке операции и увеличению сроков рассмотрения.",
              "Платформа не несет ответственности за банковские комиссии, курсовые разницы и ограничения третьих лиц в пределах, допускаемых законом.",
            ],
          },
        ],
        note:
          "Служба поддержки готова помочь с вопросами отмены и возврата в рамках условий каждого конкретного бронирования.",
      },
      security: {
        title: "Политика конфиденциальности",
        intro: "Ваши персональные данные и платежи защищены современными мерами безопасности и строго контролируемым доступом.",
        sections: [
          {
            title: "Защита данных",
            items: [
              "Все данные шифруются при передаче с использованием отраслевых стандартов.",
              "Доступ к персональным данным имеют только уполномоченные сотрудники по принципу необходимости.",
              "Мы собираем только те данные, которые необходимы для оформления бронирования и оказания услуг.",
            ],
          },
          {
            title: "Безопасность платежей",
            body: "Платежи обрабатываются надежными провайдерами, соответствующими стандарту PCI DSS. Данные банковских карт обрабатываются исключительно ими и не хранятся у нас.",
            items: [
              "Защищенная страница оплаты и постоянный мониторинг мошенничества.",
              "3-D Secure или аналогичная проверка, если она доступна.",
              "Подтверждения платежей и бронирований отправляются на указанный вами email.",
            ],
          },
          {
            title: "Защита аккаунта",
            items: [
              "Безопасный вход через доверенные сервисы, такие как Google.",
              "Автоматические уведомления о важных изменениях в аккаунте или бронировании.",
              "Проверка и подтверждение в случае подозрительной активности.",
            ],
          },
          {
            title: "Обязанности пользователя",
            items: [
              "Используйте надежный и уникальный пароль для вашей электронной почты.",
              "Не передавайте коды подтверждения, данные входа или платежную информацию третьим лицам.",
              "Всегда используйте только официальный домен megatours.am.",
            ],
          },
          {
            title: "Сообщение о проблемах безопасности",
            body: "При подозрении на несанкционированный доступ или утечку данных незамедлительно свяжитесь со службой поддержки для принятия защитных мер.",
          },
        ],
        note: "Мы постоянно совершенствуем меры безопасности для защиты ваших данных и сохранения вашего доверия.",
      },
    },
    profile: {
      title: "Ваш личный кабинет путешествий",
      subtitle: "Все бронирования, поиски и ключевые детали — в одном месте.",
      memberSince: "На платформе с",
      signIn: {
        title: "Войдите, чтобы увидеть свои поездки",
        body: "Войдите через Google, чтобы открыть бронирования, историю поиска и предпочтения.",
        cta: "Войти через Google",
      },
      stats: {
        bookings: "Всего бронирований",
        searches: "Сохраненные поиски",
        favorites: "Избранные отели",
        nights: "Ночей в поиске",
        lastActivity: "Последняя активность",
      },
      bookings: {
        title: "Ваши бронирования",
        subtitle: "Статус и подтверждения — в одном месте.",
        emptyTitle: "Бронирований пока нет",
        emptyBody: "Когда вы забронируете отель, здесь появятся номера подтверждений.",
        status: {
          confirmed: "Подтверждено",
          pending: "В обработке",
          failed: "Не удалось",
          unknown: "Ожидание",
        },
        labels: {
          bookingId: "ID бронирования",
          confirmation: "Подтверждение",
          hotelCode: "Код отеля",
          destination: "Направление",
          rooms: "Номера",
          guests: "Гости",
          total: "Итого",
          bookedOn: "Дата бронирования",
        },
        viewHotel: "Открыть отель",
        viewVoucher: "Смотреть ваучер",
        downloadVoucher: "Скачать PDF",
      },
      voucher: {
        title: "Ваучер бронирования",
        subtitle: "Сохраните ваучер для заселения и услуг.",
        downloadPdf: "Скачать PDF",
        backToProfile: "Назад в профиль",
        issuedOn: "Дата выдачи",
        paymentNote: "Этот ваучер подтверждает детали вашего бронирования.",
        sections: {
          stay: "Данные проживания",
          payment: "Сводка оплаты",
          services: "Включения",
          guests: "Список гостей",
          notes: "Важно",
        },
        notes: "Покажите ваучер при заселении и для услуг. При изменениях свяжитесь с поддержкой.",
      },
      searches: {
        title: "История поиска",
        subtitle: "Возвращайтесь к поиску за пару секунд.",
        emptyTitle: "Поисков пока нет",
        emptyBody: "Начните поиск — и последние запросы будут храниться здесь.",
        labels: {
          dates: "Даты",
          results: "Результаты",
          rooms: "Номера",
          guests: "Гости",
          destination: "Направление",
          hotel: "Отель",
          searchedOn: "Дата поиска",
        },
        searchAgain: "Повторить поиск",
      },
      favorites: {
        title: "Избранные отели",
        subtitle: "Сохраненные варианты, чтобы вернуться к ним в один клик.",
        emptyTitle: "Избранных пока нет",
        emptyBody: "Нажмите «Сохранить» на странице отеля, и он появится здесь.",
        viewHotel: "Открыть отель",
        locationFallback: "Локация не указана",
        labels: {
          rating: "Рейтинг",
          savedOn: "Сохранено",
          code: "Код отеля",
        },
      },
      insights: {
        title: "Инсайты",
        subtitle: "Короткий срез ваших путешествий.",
        labels: {
          topDestination: "Частое направление",
          averageStay: "Средняя длительность",
          roomsBooked: "Забронировано номеров",
          lastBooking: "Последнее бронирование",
        },
        empty: "Недостаточно данных",
      },
      actions: {
        title: "Быстрые действия",
        browse: "Смотреть подборку",
        items: {
          newSearch: {
            title: "Новый поиск",
            body: "Найдите свежие цены по всем эмиратам.",
            cta: "Искать отели",
          },
          savedTravelers: {
            title: "Сохраненные путешественники",
            body: "Храните данные для быстрого оформления.",
            cta: "Скоро",
          },
          priceAlerts: {
            title: "Уведомления о ценах",
            body: "Следите за тарифами и получайте уведомления.",
            cta: "Скоро",
          },
        },
      },
    errors: {
      title: "Не удалось загрузить данные",
      body: "Пожалуйста, попробуйте позже.",
    },
  },
  admin: {
    title: "Админ-панель",
    subtitle: "Все бронирования и действия в одном месте.",
    dashboard: {
      title: "Панель управления",
      subtitle: "Быстрый доступ ко всем разделам админки.",
      navTitle: "Разделы управления",
      navSubtitle: "Выберите нужный раздел.",
      open: "Открыть",
      cards: {
        bookings: "Просматривайте и управляйте бронированиями.",
        featured: "Настраивайте подборку отелей на главной.",
        users: "Профили пользователей и их активность.",
        searches: "Отслеживайте последние поиски.",
        favorites: "Сохраненные отели пользователей.",
        services: "Управляйте доступностью услуг.",
      },
    },
    services: {
      title: "Доступность услуг",
      subtitle: "Включайте или отключайте услуги для пользователей.",
      panelTitle: "Доступные услуги",
      note: "Отключенные услуги будут недоступны в конструкторе пакета.",
      saved: "Изменения сохранены.",
      actions: {
        save: "Сохранить изменения",
        saving: "Сохранение...",
      },
      status: {
        enabled: "Включено",
        disabled: "Отключено",
      },
      errors: {
        saveFailed: "Не удалось сохранить доступность услуг.",
      },
    },
    featured: {
      title: "Избранные отели",
      subtitle: "Настройте карусель отелей на главной странице.",
      searchTitle: "Поиск отелей Aoryx",
      searchSubtitle: "Выберите отель с рейтингом 4+ и заполните данные карточки.",
      searchLabel: "Найти отель",
      searchPlaceholder: "Поиск по названию или направлению",
      loading: "Загрузка отелей...",
      noResults: "Отели не найдены",
      alreadySelected: "Уже добавлен",
      formTitle: "Данные карточки",
      formSubtitle: "Добавьте цену и локализованные бейдж/наличие.",
      emptyTitle: "Выберите отель",
      emptyBody: "Выберите отель из результатов поиска.",
      fields: {
        priceFrom: "Цена",
        oldPrice: "Старая цена",
        badge: "Текст бейджа",
        availability: "Наличие",
        amenities: "Удобства",
        selected: "выбрано",
      },
      previewLabel: "Предпросмотр",
      listTitle: "Список избранных отелей",
      listSubtitle: "Управляйте отелями на главной странице.",
      listEmptyTitle: "Избранных отелей пока нет",
      listEmptyBody: "Добавьте первый отель из списка поиска.",
      actions: {
        save: "Сохранить",
        saving: "Сохранение...",
        edit: "Редактировать",
        remove: "Удалить",
        removing: "Удаление...",
        clear: "Очистить",
      },
      validation: {
        selectHotel: "Сначала выберите отель.",
        priceFrom: "Введите цену больше 0.",
        oldPrice: "Введите старую цену больше 0.",
        amenities: "Выберите ровно 3 удобства.",
        amenitiesLimit: "Можно выбрать не более 3 удобств.",
        translations: "Заполните бейдж и наличие для всех языков.",
      },
      errors: {
        saveFailed: "Не удалось сохранить отель.",
        removeFailed: "Не удалось удалить отель.",
      },
    },
    users: {
      title: "Пользователи",
      subtitle: "Последние пользователи и их активность.",
      emptyTitle: "Пользователи не найдены",
      emptyBody: "Пока нет записей пользователей.",
      stats: {
        total: "Всего пользователей",
      },
      columns: {
        user: "Пользователь",
        email: "Email",
        lastLogin: "Последний вход",
        lastSearch: "Последний поиск",
        lastBooking: "Последнее бронирование",
        createdAt: "Создано",
      },
    },
    searches: {
      title: "Поиски",
      subtitle: "Последняя поисковая активность.",
      emptyTitle: "Поиски не найдены",
      emptyBody: "Пока нет записей поиска.",
      columns: {
        user: "Пользователь",
        destination: "Направление",
        hotel: "Отель",
        dates: "Даты",
        rooms: "Номера",
        guests: "Гости",
        createdAt: "Создано",
      },
    },
    favorites: {
      title: "Избранные отели",
      subtitle: "Сохраненные отели пользователей.",
      emptyTitle: "Избранных отелей нет",
      emptyBody: "Пока нет сохраненных отелей.",
      columns: {
        user: "Пользователь",
        hotel: "Отель",
        location: "Локация",
        rating: "Рейтинг",
        savedAt: "Сохранено",
      },
    },
    bookings: {
      title: "Все бронирования",
      subtitle: "Фильтруйте по отелю, пользователю, статусу или источнику.",
      emptyTitle: "Бронирования не найдены",
      emptyBody: "Попробуйте изменить фильтры или поисковый запрос.",
    },
    filters: {
      searchPlaceholder: "Поиск отеля, ID бронирования, e-mail...",
      statusLabel: "Статус",
      sourceLabel: "Источник",
      sortLabel: "Сортировка",
      reset: "Сбросить",
      all: "Все",
      sortOptions: {
        newest: "Сначала новые",
        oldest: "Сначала старые",
        totalHigh: "Сумма: по убыванию",
        totalLow: "Сумма: по возрастанию",
      },
    },
    columns: {
      bookingId: "ID бронирования",
      hotel: "Отель",
      user: "Пользователь",
      dates: "Даты",
      guests: "Гости",
      total: "Итого",
      status: "Статус",
      createdAt: "Создано",
      source: "Источник",
      actions: "Детали",
    },
    stats: {
      totalBookings: "Всего бронирований",
      totalGuests: "Всего гостей",
      confirmed: "Подтверждено",
      pending: "В обработке",
      failed: "Ошибка",
      unknown: "Неизвестно",
    },
    access: {
      signInTitle: "Войдите, чтобы открыть админ-панель",
      signInBody: "Доступ только для администраторов. Войдите, чтобы продолжить.",
      signInCta: "Войти через Google",
      deniedTitle: "Доступ ограничен",
      deniedBody: "Эта страница доступна только администраторам.",
      configTitle: "Доступ администратора не настроен",
      configBody: "Укажите ADMIN_EMAILS (или ADMIN_USER_IDS/ADMIN_EMAIL_DOMAINS), чтобы включить доступ.",
    },
    actions: {
      details: "Детали",
    },
    details: {
      payload: "Данные запроса",
      booking: "Результат бронирования",
    },
  },
  results: {
      filters: {
        button: "Фильтры",
        openLabel: "Открыть фильтры",
        closeLabel: "Закрыть фильтры",
        title: "Фильтры",
        priceRange: "Диапазон цен",
        rating: "Рейтинг",
        noPricing: "Данные о ценах недоступны.",
      },
      loading: "Ищем доступные варианты...",
      errorAlt: "Ошибка",
      emptyAlt: "Варианты не найдены",
      emptyMessage: "По этому запросу варианты не найдены. Попробуйте изменить даты или направление.",
      fallbackTitle: "Результаты поиска",
      placesFound: {
        one: "Найден {count} вариант",
        few: "Найдено {count} варианта",
        many: "Найдено {count} вариантов",
        other: "Найдено {count} вариантов",
      },
      sortLabel: "Сортировать по",
      sortOptions: {
        priceAsc: "Цена (сначала ниже)",
        priceDesc: "Цена (сначала выше)",
        ratingDesc: "Рейтинг (сначала выше)",
        ratingAsc: "Рейтинг (сначала ниже)",
      },
      hotel: {
        fallbackName: "Отель",
        unnamed: "Без названия",
        locationFallback: "ОАЭ",
      },
      viewOptions: "Смотреть варианты",
      errors: {
        missingSearchDetails: "Не хватает данных поиска.",
        loadFailed: "Не удалось загрузить результаты.",
      },
    },
    common: {
      backToSearch: "Вернуться к поиску",
      scrollTop: "Наверх",
      contact: "Связаться",
      contactForRates: "Для уточнения тарифов свяжитесь с нами",
      close: "Закрыть",
      yes: "Да",
      no: "Нет",
      total: "Итого",
      status: "Статус",
      night: {
        one: "{count} ночь",
        few: "{count} ночи",
        many: "{count} ночей",
        other: "{count} ночей",
      },
    },
    hotel: {
      favorites: {
        save: "Сохранить в избранное",
        saved: "Сохранено",
        saving: "Сохраняем...",
        signIn: "Войдите, чтобы сохранить",
      },
      addons: {
        title: "Конструктор пакета",
        subtitle: "Добавьте трансфер, экскурсии, страховку и авиабилеты за пару шагов.",
        badge: "Дополнительные услуги",
        actions: {
          add: "Добавить",
          remove: "Убрать",
        },
        status: {
          optional: "Опционально",
          requested: "Запрошено",
        },
        summary: {
          rooms: "Номера",
          transfers: "Трансферы",
          excursions: "Экскурсии",
          insurance: "Страховка",
          flights: "Авиабилеты",
          requested: "Запрошено",
        },
        transfers: {
          title: "Трансферы",
          description: "Трансферы из аэропорта и по городу под ваш маршрут.",
          panelTitle: "Варианты трансфера",
          airportLabel: "Аэропорт",
          paxLabel: "пасс.",
          bagsLabel: "багаж",
          includeReturn: "Добавить обратный трансфер",
          returnTotal: "Итого туда-обратно",
          oneWayTotal: "Итого в одну сторону",
          perPax: "За пассажира",
          perVehicle: "За автомобиль",
          bothWays: "В обе стороны",
          flightNumber: "Номер рейса",
          arrivalDate: "Дата и время прилета",
          vehicleQty: "Количество авто",
          loading: "Загружаем варианты трансфера...",
          noOptions: "Нет доступных вариантов трансфера.",
          missingDestination: "Выберите направление, чтобы увидеть трансферы.",
          loadFailed: "Не удалось загрузить трансферы.",
          selectRequired: "Выберите трансфер или отключите эту опцию.",
          detailsRequired: "Заполните данные рейса для трансфера.",
          flightNumberRequired: "Номер рейса обязателен.",
          arrivalRequired: "Дата и время прилета обязательны.",
        },
        excursions: {
          title: "Экскурсии",
          description: "Лучшие впечатления, собранные для вашей поездки.",
          panelTitle: "Варианты экскурсий",
          adultsLabel: "Взрослые",
          childrenLabel: "Дети",
          feeNote: "Цены включают сервисный сбор.",
          loading: "Загружаем экскурсии...",
          noOptions: "Экскурсии сейчас недоступны.",
          loadFailed: "Не удалось загрузить экскурсии.",
          unnamed: "Экскурсия",
          adultPrice: "Взрослый",
          childPrice: "Ребенок",
          totalLabel: "Итого",
          applyAll: "Применить ко всем гостям",
        },
        insurance: {
          title: "Страховка",
          description: "Добавьте туристическую страховку для спокойного отдыха.",
          panelTitle: "Выберите страховой план",
          noteLabel: "Особые пожелания (опционально)",
          notePlaceholder: "Укажите предпочтения по покрытию.",
          plans: {
            essential: {
              title: "Базовый",
              description: "Медицинское покрытие и базовая отмена поездки.",
            },
            complete: {
              title: "Полный",
              description: "Расширенное покрытие: задержки, багаж и другое.",
              highlight: "Рекомендуем",
            },
            premium: {
              title: "Премиум",
              description: "Максимальная защита и повышенные лимиты.",
            },
          },
        },
        flights: {
          title: "Авиабилеты",
          description: "Опишите маршрут — мы подберем лучшие тарифы.",
          panelTitle: "Запрос на перелет",
          originLabel: "Откуда",
          destinationLabel: "Куда",
          departureLabel: "Дата вылета",
          returnLabel: "Дата возвращения",
          cabinLabel: "Класс",
          cabinPlaceholder: "Выберите класс",
          notesLabel: "Комментарий",
          notesPlaceholder: "Предпочтения по авиакомпаниям и др.",
          cabin: {
            economy: "Эконом",
            premium: "Премиум эконом",
            business: "Бизнес",
            first: "Первый",
          },
        },
      },
      map: {
        viewAria: "Показать отель на карте",
        showButton: "Показать на карте",
        title: "Расположение отеля",
        iframeTitle: "Карта отеля",
        ariaLabel: "Карта расположения отеля",
        closeLabel: "Закрыть карту",
      },
      amenities: {
        title: "Удобства отеля",
        showLess: "Скрыть",
        showAll: "Показать все удобства",
      },
      searchTitle: "Создайте свое следующее незабываемое путешествие.",
      roomOptions: {
        loading: "Загружаем варианты номеров...",
        empty: "Варианты номеров отсутствуют.",
        noMatch: "Нет вариантов, соответствующих фильтрам.",
        count: {
          one: "{count} вариант номера",
          few: "{count} варианта номера",
          many: "{count} вариантов номеров",
          other: "{count} вариантов номеров",
        },
        of: "из {total}",
        filterMeal: "Питание",
        filterPrice: "Цена",
        allMeals: "Все варианты питания",
        recommended: "Рекомендуем",
        lowestPrice: "Самая низкая цена",
        highestPrice: "Самая высокая цена",
        roomOptionFallback: "Вариант номера",
        mealPlans: {
          roomOnly: "Без питания",
          breakfast: "Завтрак",
          halfBoard: "Полупансион",
          fullBoard: "Полный пансион",
          allInclusive: "Все включено",
          ultraAllInclusive: "Ультра все включено",
        },
        refundable: "С возвратом",
        nonRefundable: "Невозвратный",
        roomsLeft: {
          one: "Остался {count} номер",
          few: "Осталось {count} номера",
          many: "Осталось {count} номеров",
          other: "Осталось {count} номеров",
        },
        roomBreakdown: "Номер {index}: {price}",
        signInToBook: "Войдите, чтобы забронировать",
        checkingAvailability: "Проверяем наличие...",
        bookNow: "Забронировать",
      },
      booking: {
        titleFallback: "Данные гостей",
        successMessage: "Заявка на бронирование успешно отправлена.",
        confirmationNumberLabel: "Номер подтверждения",
        priceChangeWarning: "Цена изменилась во время проверки. Подтвердите обновленную цену перед бронированием.",
        priceChangeConfirm: "Подтверждаю новую цену и хочу продолжить.",
        resetPackageWarning: "Изменение уже выбранного параметра приведет к сбросу выбранных вами пакетов.",
        resetPackageConfirm: "Подтверждаю сброс выбранных услуг пакета.",
        titles: {
          mr: "Г-н",
          ms: "Г-жа",
          mrs: "Г-жа",
          master: "Мастер",
        },
        firstNamePlaceholder: "Имя",
        lastNamePlaceholder: "Фамилия",
        mealPlanLabel: "Тип питания",
        rateTypeLabel: "Тип тарифа",
        bedTypeSingle: "Тип кровати",
        bedTypePlural: "Типы кроватей",
        inclusionsLabel: "Включено",
        cancellationPolicyTitle: "Условия отмены",
        noPenaltyDetails: "Детали штрафов не указаны.",
        remarksTitle: "Примечания",
        additionalInfo: "Дополнительная информация",
        roomPriceLabel: "Цена номера",
        paymentNote: "Вы будете перенаправлены в Idram для завершения оплаты.",
        redirectingToIdram: "Переходим в Idram...",
        payWithIdram: "Оплатить через Idram",
        selectRoom: "Выбрать этот вариант",
        closeBookingAria: "Закрыть бронирование",
      },
      policy: {
        freeCancellation: "Бесплатная отмена",
        from: "С",
        until: "до",
      },
      remarks: {
        types: {
          mandatory: "Обязательно",
          mandatoryTax: "Обязательный налог",
          mandatoryFee: "Обязательный сбор",
          mandatoryCharge: "Обязательное начисление",
          optional: "Опционально",
          knowBeforeYouGo: "Важно перед поездкой",
          disclaimer: "Отказ от ответственности",
          note: "Примечание",
        },
        defaultLabel: "Информация",
      },
      policies: {
        types: {
          cancellation: "Отмена",
          noShow: "Неявка",
          modification: "Изменение",
        },
        defaultLabel: "Правило",
      },
      errors: {
        roomNeedsAdult: "В номере {room} должен быть как минимум один взрослый.",
        missingGuestNames: "Пожалуйста, укажите имя и фамилию для каждого гостя.",
        invalidGuestAges: "Возраст гостей должен быть числом.",
        invalidChildAge: "Возраст ребенка должен быть от 0 до 17.",
        invalidAdultAge: "Возраст взрослого должен быть не менее 18 лет.",
        checkingSignIn: "Проверяем статус входа. Повторите попытку.",
        signInToBook: "Пожалуйста, войдите, чтобы забронировать этот номер.",
        missingSession: "Не хватает данных сессии. Запустите поиск заново.",
        cannotBookOption: "Этот вариант сейчас недоступен для бронирования. Попробуйте другой.",
        missingRateKeys: "Не удалось получить данные тарифа. Попробуйте другой вариант.",
        unableBuildGuests: "Не удалось сформировать данные гостей для этого выбора.",
        prebookFailed: "Не удалось предварительно забронировать тариф.",
        signInToComplete: "Пожалуйста, войдите, чтобы завершить бронирование.",
        confirmPriceChange: "Подтвердите обновленную цену перед бронированием.",
        missingSessionPrebook: "Не хватает данных сессии. Повторите предбронирование.",
        missingDestination: "Не указан код направления. Запустите поиск заново.",
        roomMissingRateKey: "В номере {room} нет данных тарифа.",
        roomMissingPrice: "В номере {room} нет данных о цене.",
        redirectPayment: "Не удалось перейти к оплате.",
        startPaymentFailed: "Не удалось начать оплату.",
        loadHotelFailed: "Не удалось загрузить информацию об отеле.",
        loadRoomOptionsFailed: "Не удалось загрузить варианты номеров.",
      },
    },
    gallery: {
      label: "Галерея отеля",
      imageAlt: "{name} — изображение {index}",
      closeLabel: "Закрыть изображение",
      prevLabel: "Предыдущее изображение",
      nextLabel: "Следующее изображение",
    },
  },
};

export function getTranslations(locale: Locale = defaultLocale): Translation {
  return translations[locale] ?? translations[defaultLocale];
}
