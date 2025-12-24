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
    childrenLabel: string;
    childrenAges: string;
    roomsLabel: string;
    datePlaceholder: string;
    submitIdle: string;
    submitLoading: string;
    unknownHotel: string;
    errors: {
      missingLocation: string;
      missingDates: string;
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
  trustStats: {
    title: string;
    stats: { value: string; label: string; icon: string }[];
  };
  exclusives: {
    offers: { title: string; badge: string; description: string; cta: string }[];
  };
  featured: { title: string; subtitle: string; cta: string };
  perks: {
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
  };
  home: {
    payLater: {
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
    contact: string;
    contactForRates: string;
    close: string;
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
      { href: "#featured", label: "Ընտրված հյուրանոցներ" },
      { href: "#offers", label: "Հատուկ առաջարկներ" },
      { href: "#perks", label: "Առավելություններ" },
    ],
    labels: { exclusive: "Բացառիկ" },
    hero: {
      title: "ԱՄԷ-ի հյուրանոցների էքսկլյուզիվ գներ՝ ուղիղ տուրօպերատորից",
      subtitle:
        "Հյուրանոց, տրանսֆեր, էքսկուրսիաներ ու թեմատիկ պարկերի տոմսեր՝ մեկ ամրագրումով, առանց միջնորդների ու թաքնված վճարների։",
      purpose:
        "Megatours-ը ԱՄԷ-ի ճանապարհորդությունների ամրագրման հարթակ է՝ հյուրանոցներ, տրանսֆերներ և փորձառություններ որոնելու, համեմատելու և մեկ վայրում ամրագրելու համար։",
      marquee: " ՀՅՈՒՐԱՆՈՑՆԵՐ  ✦  ՏՐԱՆՍՖԵՐՆԵՐ  ✦  ԹԵՄԱՏԻԿ ՊԱՐԿԵՐԻ ՏՈՄՍԵՐ  ✦  ԷՔՍԿՈՒՐՍԻԱՆԵՐ  ✦  ԱՎԻԱՏՈՄՍԵՐ  ✦  ԱՊԱՀՈՎԱԳՐՈՒԹՅՈՒՆ  ✦ ",
    },
    search: {
      wherePlaceholder: "Քաղաք, տեսարժան վայր կամ հյուրանոց",
      loadingDestinations: "Ուղղությունների բեռնում...",
      noLocations: "Ուղղություն կամ հյուրանոց չի գտնվել",
      adultsLabel: "Մեծահասակ",
      childrenLabel: "Երեխա",
      childrenAges: "Երեխայի տարիքը",
      roomsLabel: "Սենյակ",
      datePlaceholder: "Ընտրել ամսաթվերը",
      submitIdle: "Որոնել",
      submitLoading: "Որոնում...",
      unknownHotel: "Անհայտ հյուրանոց",
      errors: {
        missingLocation: "Խնդրում ենք ընտրել ուղղություն կամ հյուրանոց։",
        missingDates: "Խնդրում ենք ընտրել մուտքի և ելքի ամսաթվերը։",
        submit: "Չհաջողվեց կատարել որոնումը։",
      },
    },
    services: {
      title: "Ամեն ինչ՝ կատարյալ հանգստի համար",
      items: [
        {
          icon: "directions_car",
          title: "Տրանսֆերներ",
          description: "Հարմարավետ օդանավակայանային և քաղաքային տրանսֆերներ",
        },
        {
          icon: "hotel",
          title: "Հյուրանոցներ",
          description: "480+ պրեմիում հյուրանոցներ ԱՄԷ-ում՝ էքսկլյուզիվ գներով",
        },
        {
          icon: "tour",
          title: "Էքսկուրսիաներ",
          description: "Ընտրված տուրեր և եզակի փորձառություններ",
        },
        {
          icon: "attractions",
          title: "Թեմատիկ պարկեր",
          description: "Առանց հերթի մուտք՝ լավագույն ատրակցիոններին",
        },
        {
          icon: "flight",
          title: "Ավիատոմսեր",
          description: "Լավագույն առաջարկներ ավիատոմսերի համար ամբողջ աշխարհում",
        },
        {
          icon: "shield_with_heart",
          title: "Ապահովագրություն",
          description: "Ապահովագրություն՝ հանգիստը վստահ պահելու համար",
        },
      ],
    },
    bundleSave: {
      title: "Միավորիր ծառայությունները և խնայիր մինչև 30%",
      savings: "Խնայիր մինչև 30%",
      features: [
        {
          icon: "savings",
          title: "Լավագույն գնի երաշխիք",
          description: "Գինը կհամեմատենք և կառաջարկենք լավագույն տարբերակը",
        },
        {
          icon: "schedule",
          title: "Ամեն ինչ մեկ ամրագրմամբ",
          description: "Խնայիր ժամանակ՝ մեկ պատվերով",
        },
        {
          icon: "support_agent",
          title: "24/7 աջակցություն",
          description: "Անհատական կոնսիերժ՝ ճանապարհորդության ողջ ընթացքում",
        },
      ],
      cta: "Կազմել փաթեթ",
    },
    trustStats: {
      title: "Մեզ վստահում են հազարավոր ճանապարհորդներ",
      stats: [
        { value: "50,000+", label: "Գոհ հյուրեր", icon: "people" },
        { value: "4.9/5", label: "Միջին գնահատական", icon: "star" },
        { value: "24/7", label: "Աջակցություն օնլայն", icon: "support_agent" },
        { value: "100%", label: "Ապահով ամրագրում", icon: "security" },
      ],
    },
    exclusives: {
      offers: [
        {
          title: "Dubai Marina ֆլեշ-սեյլ",
          badge: "-18% այս շաբաթ",
          description: "Արևածագային սյուիտներ, տանիքավեր լողավազան և մարինայի տեսարաններ՝ սահմանափակ գներով",
          cta: "Դիտել Marina stay-երը",
        },
        {
          title: "Աբու Դաբի մշակութային փախուստ",
          badge: "Թանգարաններ և ավազաթմբեր",
          description: "Saadiyat վիլլաներ՝ նախաճաշ, ուշ դուրսգրում և Louvre add-on-ներով",
          cta: "Բացել Աբու Դաբի առաջարկները",
        },
        {
          title: "Staycation Palm-ում",
          badge: "Միայն տեղացիների համար",
          description: "Palm Jumeirah հանգստյան օրեր՝ մասնավոր լողափ և կոմպլիմենտար բրանչ",
          cta: "Ակտիվացնել Palm perks",
        },
      ],
    },
    featured: {
      title: "Հյուրանոցներ՝ բոնուսներով արդեն ներառված",
      subtitle: "Նախապես համաձայնեցված հավելումներ, ճկուն չեղարկում, ակնթարթային հաստատում",
      cta: "Տեսնել բոլոր էմիրաթները",
    },
    perks: {
      title: "Ամեն ինչ, ինչ սպասում են ուղիղ հյուրերը",
      items: [
        {
          title: "Քաղաք, ծով, անապատ",
          body: "Դուբայ, Աբու Դաբի և հյուսիսային էմիրաթների ընտրանի",
        },
        {
          title: "Թափանցիկ գներ",
          body: "Բոլոր հարկերը ներառված են, ճկուն պայմաններով",
        },
        {
          title: "Կոնսիերժ հայերեն/անգլերեն",
          body: "Տրանսֆեր, ուշ դուրսգրում, ռեստորանների ամրագրում",
        },
        {
          title: "Պրոֆիլ՝ վերադարձի համար",
          body: "Պահպանիր որոնումները և ամրագրիր արագ Google-ով",
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
      guestNameFallback: "Հյուրը",
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
    },
    home: {
      payLater: {
        title: "Հանգստացեք հիմա, վճարեք հետո",
        body: "Օգտվեք RocketLine-ից և վճարեք հանգիստը մինչև 60 ամիս՝ հարմար ամսականով։",
        alt: "Հանգիստ",
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
    },
    policies: {
      refund: {
        title: "Վերադարձի քաղաքականություն",
        intro:
          "Թափանցիկ ու արդար պայմաններ. վերադարձի իրավունքը կախված է ընտրած սակագնից և հյուրանոցի կանոններից, որոնք տեսնում եք վճարումից առաջ։",
        sections: [
          {
            title: "Երբ հնարավոր է վերադարձ",
            items: [
              "Ամրագրումը չեղարկվում է անվճար չեղարկման ժամկետի ընթացքում, որը նշված է վճարման պահին։",
              "Ընտրված սակագինը վերադարձվող է։",
              "Չեղարկման հայտը ստանում ենք մինչև հյուրանոցի վերջնաժամկետը։",
            ],
          },
          {
            title: "Ինչպես է հաշվարկվում վերադարձը",
            body: "Վերադարձը կատարվում է հյուրանոցի կանոններով և կարող է չներառել չվերադարձվող վճարներ կամ տույժեր։",
            items: [
              "Գումարը վերադարձվում է նույն վճարային եղանակին։",
              "Բանկի կամ փոխարժեքի միջնորդավճարները կախված են քարտի թողարկողից։",
              "Եթե կա տույժ, այն կերևա չեղարկման ամփոփման մեջ։",
            ],
          },
          {
            title: "Տիպիկ ժամկետներ",
            items: [
              "Չեղարկման հաստատումը՝ մինչև 24 ժամում։",
              "Գումարի վերադարձը բանկի կողմից՝ 5-ից 15 աշխատանքային օրում։",
              "Եթե վճարային գործընկերը հավելյալ ստուգում պահանջի, մենք տեղեկացնում ենք ձեզ։",
            ],
          },
          {
            title: "Ինչպես դիմել",
            items: [
              "Օգտվեք հաստատման նամակում գտնվող չեղարկման հղումից կամ կապվեք աջակցությանը։",
              "Նշեք ամրագրման համարը և հյուրի անունը՝ արագացման համար։",
              "Փոփոխությունները կամ մասամբ չեղարկումները կիրառվում են նույն կանոններով։",
            ],
          },
          {
            title: "Չվերադարձվող դեպքեր",
            items: [
              "Չվերադարձվող կամ ակցիոն սակագներ։",
              "Չեկած հյուր (no-show) կամ վերջնաժամկետից հետո չեղարկում։",
              "Երրորդ կողմի ծառայություններ՝ փոխանցումներ, տոմսեր, էքսկուրսիաներ՝ սեփական կանոններով։",
            ],
          },
        ],
        note: "Եթե ունեք հարցեր, մեր աջակցությունը պատրաստ է օգնել և պարզաբանել ընթացակարգը։",
      },
      security: {
        title: "Գաղտնիության քաղաքականություն",
        intro: "Ձեր տվյալներն ու վճարումները պաշտպանված են ժամանակակից անվտանգության պրակտիկայով և վերահսկվող մուտքով։",
        sections: [
          {
            title: "Տվյալների պաշտպանություն",
            items: [
              "Տվյալները փոխանցման ընթացքում կոդավորված են։",
              "Մուտքը սահմանափակ է միայն լիազորված աշխատակիցների համար։",
              "Հավաքում ենք միայն ամրագրման համար անհրաժեշտ տվյալները։",
            ],
          },
          {
            title: "Վճարումների անվտանգություն",
            body: "Վճարումները կատարվում են վստահելի գործընկերների միջոցով, իսկ քարտային տվյալները մշակվում են նրանց կողմից։",
            items: [
              "Անվտանգ վճարման էջ և խարդախության վերահսկում։",
              "3-D Secure կամ համարժեք հաստատում, եթե հասանելի է։",
              "Հաստատումները ուղարկվում են ձեր նշած էլ. հասցեին։",
            ],
          },
          {
            title: "Հաշվի պաշտպանություն",
            items: [
              "Մուտք վստահելի ծառայություններով, օրինակ՝ Google։",
              "Կարևոր փոփոխությունների մասին արագ ծանուցումներ։",
              "Կասկածելի ակտիվության դեպքում օգնում ենք ստուգել։",
            ],
          },
          {
            title: "Խորհուրդներ ձեր անվտանգության համար",
            items: [
              "Օգտագործեք ուժեղ և եզակի գաղտնաբառ ձեր էլ. փոստի համար։",
              "Չկիսվեք հաստատման կոդերով կամ վճարային տվյալներով։",
              "Օգտագործեք միայն պաշտոնական megatours.am տիրույթը։",
            ],
          },
          {
            title: "Եթե կասկածում եք խնդիր",
            body: "Անմիջապես կապվեք մեր աջակցությանը, և մենք կօգնենք պաշտպանել ձեր հաշիվը։",
          },
        ],
        note: "Մենք մշտապես բարելավում ենք պաշտպանությունը՝ ձեր վստահությունը պահպանելու համար։",
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
          rating: "Վարկանիշ",
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
    results: {
      filters: {
        button: "Ֆիլտրեր",
        openLabel: "Բացել ֆիլտրերը",
        closeLabel: "Փակել ֆիլտրերը",
        title: "Ֆիլտրեր",
        priceRange: "Գնի միջակայք",
        rating: "Վարկանիշ",
        noPricing: "Գնի տվյալները հասանելի չեն։",
      },
      loading: "Հյուրանոցների որոնում...",
      errorAlt: "Սխալ",
      emptyAlt: "Հյուրանոցներ չկան",
      emptyMessage: "Այս որոնման համար հյուրանոց չգտնվեց։ Փորձեք փոխել ամսաթվերը կամ ուղղությունը։",
      fallbackTitle: "ԱՄԷ-ում հանգիստ",
      placesFound: {
        one: "{count} տարբերակ գտնվեց",
        other: "{count} տարբերակ գտնվեց",
      },
      sortLabel: "Դասավորել ըստ",
      sortOptions: {
        priceAsc: "Գին (ցածրից բարձր)",
        priceDesc: "Գին (բարձրից ցածր)",
        ratingDesc: "Վարկանիշ (բարձրից ցածր)",
        ratingAsc: "Վարկանիշ (ցածրից բարձր)",
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
      contact: "Կապվել",
      contactForRates: "Կապվեք գների համար",
      close: "Փակել",
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
      searchTitle: "Ստեղծիր քո հաջորդ անմոռանալի փորձառությունը։",
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
        refundable: "Վերադարձվող",
        nonRefundable: "Չվերադարձվող",
        roomsLeft: {
          one: "{count} սենյակ մնաց",
          other: "{count} սենյակ մնաց",
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
      { href: "#featured", label: "Featured stays" },
      { href: "#offers", label: "Special offers" },
      { href: "#perks", label: "Perks" },
    ],
    labels: { exclusive: "Exclusive" },
    hero: {
      title: "UAE hotel exclusives, direct from the tour operator",
      subtitle:
        "Hotels, transfers, excursions, and theme park tickets in one booking—no middlemen, no hidden fees.",
      purpose:
        "Megatours is a UAE travel booking platform to search, compare, and book hotels, transfers, and experiences in one place.",
      marquee: " HOTELS  ✦  TRANSFERS  ✦  THEME PARK TICKETS  ✦  EXCURSIONS  ✦  FLIGHTS  ✦  INSURANCE  ✦ ",
    },
    search: {
      wherePlaceholder: "City, landmark, or hotel",
      loadingDestinations: "Loading destinations...",
      noLocations: "No destinations or hotels found",
      adultsLabel: "Adults",
      childrenLabel: "Children",
      childrenAges: "Child age",
      roomsLabel: "Rooms",
      datePlaceholder: "Select dates",
      submitIdle: "Search",
      submitLoading: "Searching...",
      unknownHotel: "Unknown hotel",
      errors: {
        missingLocation: "Please select a destination or hotel.",
        missingDates: "Please choose check-in and check-out dates.",
        submit: "Unable to submit search.",
      },
    },
    services: {
      title: "Everything you need for a perfect trip",
      items: [
        {
          icon: "directions_car",
          title: "Transfers",
          description: "Comfortable airport and city transfers",
        },
        {
          icon: "hotel",
          title: "Hotels",
          description: "480+ premium UAE properties with exclusive rates",
        },
        {
          icon: "tour",
          title: "Excursions",
          description: "Curated tours and unforgettable experiences",
        },
        {
          icon: "attractions",
          title: "Theme Parks",
          description: "Skip-the-line tickets to top attractions",
        },
        {
          icon: "flight",
          title: "Flights",
          description: "Great fares on flights worldwide",
        },
        {
          icon: "shield_with_heart",
          title: "Insurance",
          description: "Travel insurance to cover every step",
        },
      ],
    },
    bundleSave: {
      title: "Bundle services and save up to 30%",
      savings: "Save up to 30%",
      features: [
        {
          icon: "savings",
          title: "Best Price Guarantee",
          description: "We match or beat comparable offers",
        },
        {
          icon: "schedule",
          title: "One booking, everything",
          description: "Save time with a single reservation",
        },
        {
          icon: "support_agent",
          title: "24/7 concierge",
          description: "Dedicated support for your whole trip",
        },
      ],
      cta: "Build a package",
    },
    trustStats: {
      title: "Trusted by thousands of travelers",
      stats: [
        { value: "50,000+", label: "Happy guests", icon: "people" },
        { value: "4.9/5", label: "Average rating", icon: "star" },
        { value: "24/7", label: "Support online", icon: "support_agent" },
        { value: "100%", label: "Secure booking", icon: "security" },
      ],
    },
    exclusives: {
      offers: [
        {
          title: "Dubai Marina flash sale",
          badge: "-18% this week",
          description: "Sunrise suites, rooftop pools, and marina views—limited nightly rates.",
          cta: "View Marina stays",
        },
        {
          title: "Abu Dhabi culture escape",
          badge: "Museums & dunes",
          description: "Saadiyat villas with breakfast, late checkout, and Louvre add-ons.",
          cta: "Explore Abu Dhabi offers",
        },
        {
          title: "Staycation on the Palm",
          badge: "Locals-only",
          description: "Palm Jumeirah weekends with private beach access and complimentary brunch.",
          cta: "Unlock Palm perks",
        },
      ],
    },
    featured: {
      title: "Stays with built-in perks",
      subtitle: "Pre-negotiated extras, flexible cancellation, instant confirmations",
      cta: "Explore all emirates",
    },
    perks: {
      title: "Everything direct guests expect—without the fine print",
      items: [
        {
          title: "Beach, city, desert",
          body: "Curated Dubai, Abu Dhabi, and northern emirates inventory",
        },
        {
          title: "Transparent pricing",
          body: "Tax-inclusive rates and flexible policies",
        },
        {
          title: "Concierge in Arabic/English",
          body: "Transfers, late checkout, and dining reservations",
        },
        {
          title: "Return-ready profiles",
          body: "Save searches and rebook faster with Google",
        },
      ],
    },
    card: {
      from: "From",
      perNight: "/ night",
      reviews: "verified reviews",
      cta: "Hold room",
    },
    auth: {
      checking: "Checking...",
      signedIn: "Signed in",
      signOut: "Sign out",
      signIn: "Sign in",
      guestInitialsFallback: "Guest",
      guestNameFallback: "Traveler",
    },
    accessibility: {
      skipToContent: "Skip to main content",
      servicesSection: "Our services section",
      bundleSection: "Bundle and save section",
    },
    header: {
      openMenu: "Open menu",
      closeMenu: "Close menu",
      primaryNav: "Primary navigation",
    },
    footer: {
      refundPolicy: "Refund policy",
      securityPolicy: "Privacy policy",
      b2bPartnership: "B2B partnership",
    },
    home: {
      payLater: {
        title: "Relax now, pay later",
        body: "Use RocketLine and spread your trip cost over up to 60 months.",
        alt: "Vacation",
      },
    },
    payment: {
      success: {
        title: "Payment received",
        body: "Thanks for your payment. We're confirming your booking now.",
        note: "If you don't receive a confirmation shortly, please contact support.",
        cta: "Return to home",
      },
      failure: {
        title: "Payment failed",
        body: "We couldn't complete the payment. Please try again or contact support.",
        cta: "Return to home",
      },
    },
    policies: {
      refund: {
        title: "Refund policy",
        intro: "Clear, fair, and transparent. Refund eligibility depends on the rate and hotel rules shown before you pay.",
        sections: [
          {
            title: "When a refund is available",
            items: [
              "The booking is canceled within the free cancellation window shown at checkout.",
              "The selected rate is marked as refundable.",
              "We receive the cancellation request before the hotel's deadline.",
            ],
          },
          {
            title: "How the refund amount is calculated",
            body: "Refunds follow the hotel's policy and may exclude non-refundable fees or penalties.",
            items: [
              "Funds return to the original payment method.",
              "Bank or currency conversion fees are set by your card issuer.",
              "If a penalty applies, it will be shown in the cancellation summary.",
            ],
          },
          {
            title: "Typical timelines",
            items: [
              "Cancellation is confirmed within 24 hours.",
              "Banks usually post the refund within 5-15 business days.",
              "If a payment partner needs extra checks, we will keep you updated.",
            ],
          },
          {
            title: "How to request a refund",
            items: [
              "Use the cancellation link in your confirmation email or contact support.",
              "Include your booking number and guest name to speed things up.",
              "Changes or partial cancellations follow the same rules.",
            ],
          },
          {
            title: "Non-refundable cases",
            items: [
              "Non-refundable or promotional rates.",
              "No-shows or cancellations after the deadline.",
              "Third-party services (transfers, tickets, tours) with their own rules.",
            ],
          },
        ],
        note: "Questions? Our support team is ready to help and guide you through the process.",
      },
      security: {
        title: "Privacy policy",
        intro: "Your data and payments are protected with modern security practices and controlled access.",
        sections: [
          {
            title: "Data protection",
            items: [
              "Encrypted data in transit.",
              "Access limited to authorized staff on a need-to-know basis.",
              "We collect only the data required to complete your booking.",
            ],
          },
          {
            title: "Payment security",
            body: "Payments are processed by trusted providers, and card data is handled by them.",
            items: [
              "Secure checkout with fraud monitoring.",
              "3-D Secure or similar verification when available.",
              "Receipts and confirmations are sent to the email you provide.",
            ],
          },
          {
            title: "Account safety",
            items: [
              "Sign in with trusted services such as Google.",
              "Quick alerts for important booking changes.",
              "We can help verify suspicious activity.",
            ],
          },
          {
            title: "Tips to keep your account safe",
            items: [
              "Use a strong, unique password for your email account.",
              "Never share verification codes or payment details.",
              "Only use the official megatours.am domain.",
            ],
          },
          {
            title: "If you suspect an issue",
            body: "Contact support right away so we can secure your account and investigate.",
          },
        ],
        note: "We continuously improve our defenses to keep your trust.",
      },
    },
    profile: {
      title: "Your travel dashboard",
      subtitle: "All your bookings, searches, and trip details—organized in one place.",
      memberSince: "Member since",
      signIn: {
        title: "Sign in to see your trips",
        body: "Log in with Google to access bookings, search history, and personal preferences.",
        cta: "Sign in with Google",
      },
      stats: {
        bookings: "Total bookings",
        searches: "Saved searches",
        favorites: "Saved hotels",
        nights: "Nights searched",
        lastActivity: "Last activity",
      },
      bookings: {
        title: "Your bookings",
        subtitle: "Confirmation details and booking status at a glance.",
        emptyTitle: "No bookings yet",
        emptyBody: "When you book a stay, it will appear here with all confirmation numbers.",
        status: {
          confirmed: "Confirmed",
          pending: "Processing",
          failed: "Failed",
          unknown: "Pending",
        },
        labels: {
          bookingId: "Booking ID",
          confirmation: "Confirmation",
          hotelCode: "Hotel code",
          destination: "Destination",
          rooms: "Rooms",
          guests: "Guests",
          total: "Total",
          bookedOn: "Booked on",
        },
        viewHotel: "View hotel",
      },
      searches: {
        title: "Search history",
        subtitle: "Reopen a search in seconds.",
        emptyTitle: "No searches yet",
        emptyBody: "Start exploring and your recent searches will be saved here.",
        labels: {
          dates: "Dates",
          results: "Results",
          rooms: "Rooms",
          guests: "Guests",
          destination: "Destination",
          hotel: "Hotel",
          searchedOn: "Searched on",
        },
        searchAgain: "Search again",
      },
      favorites: {
        title: "Favorite hotels",
        subtitle: "Your saved stays, ready for the next booking.",
        emptyTitle: "No favorites yet",
        emptyBody: "Tap “Save” on any hotel page to keep it here for quick access.",
        viewHotel: "View hotel",
        locationFallback: "Location not specified",
        labels: {
          rating: "Rating",
          savedOn: "Saved on",
          code: "Hotel code",
        },
      },
      insights: {
        title: "Insights",
        subtitle: "A quick look at your travel patterns.",
        labels: {
          topDestination: "Top destination",
          averageStay: "Average trip length",
          roomsBooked: "Rooms booked",
          lastBooking: "Last booking",
        },
        empty: "Not enough data yet",
      },
      actions: {
        title: "Quick actions",
        browse: "Browse featured stays",
        items: {
          newSearch: {
            title: "Start a new search",
            body: "Find fresh rates across the UAE.",
            cta: "Search hotels",
          },
          savedTravelers: {
            title: "Saved travelers",
            body: "Store traveler details for faster checkout.",
            cta: "Coming soon",
          },
          priceAlerts: {
            title: "Price alerts",
            body: "Track rates and get notified.",
            cta: "Coming soon",
          },
        },
      },
      errors: {
        title: "We couldn't load your data",
        body: "Please try again in a few minutes.",
      },
    },
    results: {
      filters: {
        button: "Filters",
        openLabel: "Open filters",
        closeLabel: "Close filters",
        title: "Filters",
        priceRange: "Price range",
        rating: "Rating",
        noPricing: "No pricing data available.",
      },
      loading: "Loading available stays...",
      errorAlt: "Error",
      emptyAlt: "No hotels found",
      emptyMessage: "No hotels matched this search. Try adjusting dates or destination.",
      fallbackTitle: "UAE stays",
      placesFound: {
        one: "{count} place found",
        other: "{count} places found",
      },
      sortLabel: "Sort by",
      sortOptions: {
        priceAsc: "Price (low to high)",
        priceDesc: "Price (high to low)",
        ratingDesc: "Rating (high to low)",
        ratingAsc: "Rating (low to high)",
      },
      hotel: {
        fallbackName: "Hotel",
        unnamed: "Unnamed hotel",
        locationFallback: "UAE",
      },
      viewOptions: "View options",
      errors: {
        missingSearchDetails: "Missing search details.",
        loadFailed: "Unable to load results right now.",
      },
    },
    common: {
      backToSearch: "Back to search",
      contact: "Contact",
      contactForRates: "Contact for rates",
      close: "Close",
      total: "Total",
      status: "Status",
      night: {
        one: "{count} night",
        other: "{count} nights",
      },
    },
    hotel: {
      favorites: {
        save: "Save to favorites",
        saved: "Saved",
        saving: "Saving...",
        signIn: "Sign in to save",
      },
      map: {
        viewAria: "View hotel on map",
        showButton: "Show location on map",
        title: "Hotel location",
        iframeTitle: "Hotel map location",
        ariaLabel: "Hotel location map",
        closeLabel: "Close map",
      },
      amenities: {
        title: "Hotel amenities",
        showLess: "Show less",
        showAll: "Show all amenities",
      },
      searchTitle: "Create your next incredible experience.",
      roomOptions: {
        loading: "Loading room options...",
        empty: "No room options available.",
        noMatch: "No room options match the current filters.",
        count: {
          one: "{count} room option",
          other: "{count} room options",
        },
        of: "of {total}",
        filterMeal: "Meal",
        filterPrice: "Price",
        allMeals: "All meals",
        recommended: "Recommended",
        lowestPrice: "Lowest price",
        highestPrice: "Highest price",
        roomOptionFallback: "Room option",
        refundable: "Refundable",
        nonRefundable: "Non-refundable",
        roomsLeft: {
          one: "{count} room left",
          other: "{count} rooms left",
        },
        roomBreakdown: "Room {index}: {price}",
        signInToBook: "Sign in to book",
        checkingAvailability: "Checking availability...",
        bookNow: "Book now",
      },
      booking: {
        titleFallback: "Guest details",
        successMessage: "Your booking request was submitted successfully.",
        confirmationNumberLabel: "Confirmation number",
        priceChangeWarning: "Price changed during verification. Please confirm the updated price before booking.",
        priceChangeConfirm: "I accept the updated price and wish to proceed.",
        titles: {
          mr: "Mr.",
          ms: "Ms.",
          mrs: "Mrs.",
          master: "Master",
        },
        firstNamePlaceholder: "First name",
        lastNamePlaceholder: "Last name",
        mealPlanLabel: "Meal plan",
        rateTypeLabel: "Rate type",
        bedTypeSingle: "Bed type",
        bedTypePlural: "Bed types",
        inclusionsLabel: "Inclusions",
        cancellationPolicyTitle: "Cancellation policy",
        noPenaltyDetails: "No penalty details provided.",
        remarksTitle: "Remarks",
        additionalInfo: "Additional information",
        roomPriceLabel: "Room price",
        paymentNote: "You will be redirected to Idram to complete the payment.",
        redirectingToIdram: "Redirecting to Idram...",
        payWithIdram: "Pay with Idram",
        closeBookingAria: "Close booking",
      },
      policy: {
        freeCancellation: "Free cancellation",
        from: "From",
        until: "until",
      },
      remarks: {
        types: {
          mandatory: "Mandatory",
          mandatoryTax: "Mandatory tax",
          mandatoryFee: "Mandatory fee",
          mandatoryCharge: "Mandatory charge",
          optional: "Optional",
          knowBeforeYouGo: "Know before you go",
          disclaimer: "Disclaimer",
          note: "Note",
        },
        defaultLabel: "Info",
      },
      policies: {
        types: {
          cancellation: "Cancellation",
          noShow: "No show",
          modification: "Modification",
        },
        defaultLabel: "Policy",
      },
      errors: {
        roomNeedsAdult: "Room {room} must include at least one adult.",
        missingGuestNames: "Please enter first and last names for each guest.",
        invalidGuestAges: "Guest ages must be valid numbers.",
        invalidChildAge: "Child ages must be between 0 and 17.",
        invalidAdultAge: "Adult guests must be 18 years or older.",
        checkingSignIn: "Checking sign-in status. Please try again.",
        signInToBook: "Please sign in to book this room.",
        missingSession: "Missing session details. Please run the search again.",
        cannotBookOption: "This room option cannot be booked right now. Please try another option.",
        missingRateKeys: "Missing rate keys for this room option. Please try another option.",
        unableBuildGuests: "Unable to build guest details for this selection.",
        prebookFailed: "Failed to prebook rate.",
        signInToComplete: "Please sign in to complete the booking.",
        confirmPriceChange: "Please confirm the updated price before booking.",
        missingSessionPrebook: "Missing session details. Please prebook again.",
        missingDestination: "Missing destination code. Please search again.",
        roomMissingRateKey: "Room {room} is missing a rate key.",
        roomMissingPrice: "Room {room} is missing price details.",
        redirectPayment: "Unable to redirect to payment.",
        startPaymentFailed: "Failed to start payment.",
        loadHotelFailed: "Unable to load this hotel right now.",
        loadRoomOptionsFailed: "Unable to load room options.",
      },
    },
    gallery: {
      label: "Hotel image gallery",
      imageAlt: "{name} image {index}",
      closeLabel: "Close image",
      prevLabel: "Previous image",
      nextLabel: "Next image",
    },
  },
  ru: {
    nav: [
      { href: "#featured", label: "Подборка отелей" },
      { href: "#offers", label: "Специальные предложения" },
      { href: "#perks", label: "Преимущества" },
    ],
    labels: { exclusive: "Эксклюзив" },
    hero: {
      title: "Эксклюзивные цены на отели в ОАЭ напрямую от туроператора",
      subtitle:
        "Отель, трансфер, экскурсии и билеты в тематические парки — в одном бронировании, без посредников и скрытых платежей.",
      purpose:
        "Megatours — платформа бронирования поездок по ОАЭ, где можно искать, сравнивать и бронировать отели, трансферы и впечатления в одном месте.",
      marquee: " ОТЕЛИ  ✦  ТРАНСФЕРЫ  ✦  БИЛЕТЫ В ТЕМАТИЧЕСКИЕ ПАРКИ  ✦  ЭКСКУРСИИ  ✦  АВИАБИЛЕТЫ  ✦  СТРАХОВКА  ✦ ",
    },
    search: {
      wherePlaceholder: "Город, место или отель",
      loadingDestinations: "Загрузка направлений...",
      noLocations: "Направления или отели не найдены",
      adultsLabel: "Взрослые",
      childrenLabel: "Дети",
      childrenAges: "Возраст ребенка",
      roomsLabel: "Номера",
      datePlaceholder: "Выберите даты",
      submitIdle: "Поиск",
      submitLoading: "Ищем...",
      unknownHotel: "Неизвестный отель",
      errors: {
        missingLocation: "Пожалуйста, выберите направление или отель.",
        missingDates: "Пожалуйста, выберите даты заезда и выезда.",
        submit: "Не удалось отправить поиск.",
      },
    },
    services: {
      title: "Все для идеальной поездки",
      items: [
        {
          icon: "directions_car",
          title: "Трансферы",
          description: "Комфортные трансферы из аэропорта и по городу",
        },
        {
          icon: "hotel",
          title: "Отели",
          description: "480+ премиальных отелей в ОАЭ с эксклюзивными ценами",
        },
        {
          icon: "tour",
          title: "Экскурсии",
          description: "Подборка туров и ярких впечатлений",
        },
        {
          icon: "attractions",
          title: "Парки развлечений",
          description: "Билеты без очередей в лучшие парки",
        },
        {
          icon: "flight",
          title: "Авиабилеты",
          description: "Выгодные тарифы на перелеты по всему миру",
        },
        {
          icon: "shield_with_heart",
          title: "Страховка",
          description: "Страхование, чтобы отдых был спокойным",
        },
      ],
    },
    bundleSave: {
      title: "Соберите пакет и экономьте до 30%",
      savings: "Экономия до 30%",
      features: [
        {
          icon: "savings",
          title: "Гарантия лучшей цены",
          description: "Подбираем и фиксируем лучший вариант",
        },
        {
          icon: "schedule",
          title: "Одно бронирование",
          description: "Экономьте время: всё в одной заявке",
        },
        {
          icon: "support_agent",
          title: "Поддержка 24/7",
          description: "Персональный консьерж на всей дистанции поездки",
        },
      ],
      cta: "Собрать пакет",
    },
    trustStats: {
      title: "Нам доверяют тысячи путешественников",
      stats: [
        { value: "50,000+", label: "Довольных гостей", icon: "people" },
        { value: "4.9/5", label: "Средняя оценка", icon: "star" },
        { value: "24/7", label: "Поддержка онлайн", icon: "support_agent" },
        { value: "100%", label: "Безопасное бронирование", icon: "security" },
      ],
    },
    exclusives: {
      offers: [
        {
          title: "Флеш-распродажа в Dubai Marina",
          badge: "-18% на этой неделе",
          description: "Сьюты с рассветом, rooftop-бассейны и виды на марину — ограниченные цены",
          cta: "Смотреть отели в Marina",
        },
        {
          title: "Культурный уикенд в Абу-Даби",
          badge: "Музеи и дюны",
          description: "Виллы на Saadiyat с завтраком, поздним выездом и опцией Louvre",
          cta: "Открыть офферы Абу-Даби",
        },
        {
          title: "Staycation на Palm",
          badge: "Для резидентов",
          description: "Palm Jumeirah с приватным пляжем и комплиментарным бранчем",
          cta: "Активировать Palm perks",
        },
      ],
    },
    featured: {
      title: "Отели с включенными привилегиями",
      subtitle: "Согласованные привилегии, гибкая отмена и мгновенные подтверждения",
      cta: "Смотреть все эмираты",
    },
    perks: {
      title: "Все, что ждут прямые гости — без скрытых условий",
      items: [
        {
          title: "Пляж, город, пустыня",
          body: "Подборка Дубай, Абу-Даби и северные эмираты",
        },
        {
          title: "Прозрачные цены",
          body: "Все налоги включены, гибкие условия",
        },
        {
          title: "Консьерж на русском/английском",
          body: "Трансферы, поздний выезд и бронирование ресторанов",
        },
        {
          title: "Профили для повторных бронирований",
          body: "Сохраняйте поиски и бронируйте быстрее через Google",
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
    },
    home: {
      payLater: {
        title: "Отдыхайте сейчас, платите позже",
        body: "Оплачивайте поездку через RocketLine и распределяйте платежи до 60 месяцев.",
        alt: "Отдых",
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
    },
    policies: {
      refund: {
        title: "Политика возврата",
        intro: "Прозрачно и честно: право на возврат зависит от тарифа и правил отеля, которые вы видите до оплаты.",
        sections: [
          {
            title: "Когда возможен возврат",
            items: [
              "Бронирование отменено в период бесплатной отмены, указанный при оплате.",
              "Выбранный тариф отмечен как возвратный.",
              "Запрос на отмену поступил до дедлайна отеля.",
            ],
          },
          {
            title: "Как рассчитывается сумма возврата",
            body: "Возврат выполняется по правилам отеля и может исключать невозвратные сборы или штрафы.",
            items: [
              "Средства возвращаются на исходный способ оплаты.",
              "Комиссии банка или конвертация зависят от эмитента карты.",
              "Если применяется штраф, он будет показан в подтверждении отмены.",
            ],
          },
          {
            title: "Типичные сроки",
            items: [
              "Подтверждаем отмену в течение 24 часов.",
              "Банк обычно зачисляет средства за 5-15 рабочих дней.",
              "Если платежному провайдеру нужна дополнительная проверка, мы сообщим.",
            ],
          },
          {
            title: "Как запросить возврат",
            items: [
              "Используйте ссылку отмены в письме подтверждения или обратитесь в поддержку.",
              "Укажите номер бронирования и имя гостя для ускорения.",
              "Изменения или частичные отмены обрабатываются по тем же правилам.",
            ],
          },
          {
            title: "Невозвратные случаи",
            items: [
              "Невозвратные или промо-тарифы.",
              "Неявка (no-show) или отмена после дедлайна.",
              "Сервисы третьих сторон (трансферы, билеты, экскурсии) со своими правилами.",
            ],
          },
        ],
        note: "Если нужна помощь, служба поддержки подскажет лучший вариант.",
      },
      security: {
        title: "Политика конфиденциальности",
        intro: "Ваши данные и платежи защищены современными практиками безопасности и контролируемым доступом.",
        sections: [
          {
            title: "Защита данных",
            items: [
              "Шифрование данных при передаче.",
              "Доступ только у уполномоченных сотрудников.",
              "Собираем лишь данные, необходимые для бронирования.",
            ],
          },
          {
            title: "Безопасность платежей",
            body: "Платежи проходят через надежных провайдеров, а данные карт обрабатываются ими.",
            items: [
              "Безопасная страница оплаты и мониторинг мошенничества.",
              "3-D Secure или аналогичная проверка, если доступна.",
              "Подтверждения отправляем на указанный email.",
            ],
          },
          {
            title: "Защита аккаунта",
            items: [
              "Вход через доверенные сервисы, например Google.",
              "Оповещения о важных изменениях бронирования.",
              "Помогаем проверить подозрительную активность.",
            ],
          },
          {
            title: "Как защитить себя",
            items: [
              "Используйте надежный пароль для email.",
              "Никому не сообщайте коды подтверждения и платежные данные.",
              "Проверяйте, что вы на официальном домене megatours.am.",
            ],
          },
          {
            title: "Если заметили проблему",
            body: "Свяжитесь со службой поддержки, и мы поможем защитить аккаунт.",
          },
        ],
        note: "Мы постоянно улучшаем защиту, чтобы сохранить ваше доверие.",
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
      emptyAlt: "Отели не найдены",
      emptyMessage: "По этому запросу отели не найдены. Попробуйте изменить даты или направление.",
      fallbackTitle: "Отели ОАЭ",
      placesFound: {
        one: "{count} вариант найден",
        few: "{count} варианта найдено",
        many: "{count} вариантов найдено",
        other: "{count} вариантов найдено",
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
      contact: "Связаться",
      contactForRates: "Свяжитесь для уточнения цены",
      close: "Закрыть",
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
        refundable: "С возвратом",
        nonRefundable: "Невозвратный",
        roomsLeft: {
          one: "{count} номер остался",
          few: "{count} номера осталось",
          many: "{count} номеров осталось",
          other: "{count} номеров осталось",
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
