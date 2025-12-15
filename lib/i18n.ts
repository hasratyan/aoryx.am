export type Locale = "hy" | "en" | "ru";

export const locales: Locale[] = ["hy", "en", "ru"];
export const localeLabels: Record<Locale, string> = {
  hy: "ՀԱՅ",
  en: "ENG",
  ru: "РУС",
};
export const defaultLocale: Locale = "hy";

export type Translation = {
  localeLabel: string;
  nav: { href: string; label: string }[];
  labels: { numbers: string; exclusive: string; tripIdeas: string };
  hero: {
    title: string;
    subtitle: string;
    highlightA: { title: string; body: string };
    highlightB: { title: string; body: string };
    support: { title: string; body: string; action: string };
    tripIdea: { body: string };
    stats: { label: string; value: string }[];
    marquee: string;
  };
  search: {
    wherePlaceholder: string;
    loadingDestinations: string;
    locationsError: string;
    noLocations: string;
    adultsLabel: string;
    childrenLabel: string;
    childrenAges: string;
    defaultGuests: number;
    submitIdle: string;
    submitLoading: string;
  };
  services: {
    tag: string;
    title: string;
    subtitle: string;
    items: { icon: string; title: string; description: string }[];
  };
  bundleSave: {
    tag: string;
    title: string;
    subtitle: string;
    savings: string;
    features: { icon: string; title: string; description: string }[];
    cta: string;
  };
  trustStats: {
    tag: string;
    title: string;
    stats: { value: string; label: string }[];
  };
  exclusives: {
    tag: string;
    title: string;
    subtitle: string;
    cta: string;
    offers: { title: string; badge: string; description: string; cta: string }[];
  };
  featured: { tag: string; title: string; subtitle: string; cta: string };
  steps: { tag: string; items: { title: string; description: string }[] };
  perks: {
    tag: string;
    title: string;
    subtitle: string;
    items: { title: string; body: string }[];
    contact: { title: string; subtitle: string; button: string; hostTitle: string; hostSla: string };
  };
  faq: { tag: string; title: string; subtitle: string; items: string[] };
  card: { from: string; perNight: string; reviews: string; cta: string };
  auth: {
    checking: string;
    signedIn: string;
    signOut: string;
    signIn: string;
  };
  accessibility: {
    skipToContent: string;
    servicesSection: string;
    bundleSection: string;
    offersSection: string;
    featuredSection: string;
    stepsSection: string;
    perksSection: string;
    faqSection: string;
  };
};

const translations: Record<Locale, Translation> = {
  hy: {
    localeLabel: "Հայ",
    nav: [
      { href: "#featured", label: "Ընտրված հյուրանոցներ" },
      { href: "#offers", label: "Հատուկ առաջարկներ" },
      { href: "#perks", label: "Առավելություններ" },
    ],
    labels: { numbers: "Թվեր", exclusive: "Բացառիկ", tripIdeas: "Ճանապարհորդական գաղափարներ" },
    hero: {
      title: "ԱՄԷ հյուրանոցների էքսկլյուզիվ արժեքներ, անմիջապես տուր օպերատորից",
      subtitle:
        "Հյուրանոց, տրանսֆեր, էքսկուրսիաներ, թեմատիկ պարկերի տոմսեր՝ 1 ամրագրումով առանց միջնորդների և թաքնված վճարների։",
      highlightA: {
        title: "Անմիջական հասանելիություն",
        body: "Տես իրական գները նախքան ամրագրելն ու մուտք գործելը",
      },
      highlightB: {
        title: "Բաններ և սփեշլներ",
        body: "Ամեն օր թարմացվող UAE առաջարկներ AORYX հյուրերի համար",
      },
      support: {
        title: "Անհատական հարցմա՞ն",
        body: "Խմբային/երկարատև մնալու և staycation-ների հարցում AORYX հոսթերը կօգնեն",
        action: "24/7 աջակցություն — խոսիր հոսթի հետ",
      },
      tripIdea: {
        body: "Շաբաթավերջ Դուբայ Քրիքում․ մնա Al Seef-ում, ավելացրու աբրա տրանսֆեր և ապահով late checkout մեր հաշվին։",
      },
      stats: [
        { label: "UAE հյուրանոցներ", value: "480+" },
        { label: "Միջ. աճ", value: "18% ADR" },
        { label: "Աջակցության SLA", value: "<5 րոպե" },
        { label: "Էմիրաթներ", value: "7" },
      ],
      marquee: " ՀՅՈՒՐԱՆՈՑՆԵՐ  ✦  ՏՐԱՆՍՖԵՐՆԵՐ  ✦  ԹԵՄԱՏԻԿ ՊԱՐԿԵՐԻ ՏՈՄՍԵՐ  ✦  ԷՔՍԿՈՒՐՍԻԱՆԵՐ  ✦ ",
    },
    search: {
      wherePlaceholder: "Քաղաք, վայր կամ հյուրանոց",
      loadingDestinations: "Ուղղությունների բեռնում...",
      locationsError: "Չհաջողվեց բեռնել ուղղությունները",
      noLocations: "Ուղղություն չի գտնվել",
      adultsLabel: "Մեծահասակ",
      childrenLabel: "Երեխա",
      childrenAges: "Երեխայի տարիքը",
      defaultGuests: 2,
      submitIdle: "Որոնել",
      submitLoading: "Որոնում...",
    },
    exclusives: {
      tag: "Բաններ և սփեշլներ",
      title: "Հատուկ UAE առաջարկներ",
      subtitle: "Վերցրու սահմանափակ դրոփերը Դուբայից, Աբու Դաբիից և Ռաս Ալ Խայմայից",
      cta: "Տեսնել բոլոր առաջարկները",
      offers: [
        {
          title: "Դուբայ Մարինա ֆլեշ սեյլ",
          badge: "-18% այս շաբաթ",
          description: "Արևածագային սյուիտներ, տանիքավեր լողավազան և մարինա վյու՝ սահմանափակ գին",
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
          description: "Palm Jumeirah հանգստյան օրեր՝ մասնավոր լողափ և complimentary բրանչ",
          cta: "Ակտիվացնել Palm perks",
        },
      ],
    },
    featured: {
      tag: "UAE ընտրված",
      title: "Հյուրանոցներ՝ արդեն ներառված բոնուսներով",
      subtitle: "Նախնական պայմանավորվածություններ, ճկուն չեղարկում, ակնթարթային հաստատումներ",
      cta: "Տեսնել բոլոր էմիրաթները",
    },
    steps: {
      tag: "Ինչպես է գնում ամրագրումը",
      items: [
        {
          title: "Փնտրիր ըստ ճաշակի",
          description:
            "Dubai Marina տանիքներ, Saadiyat մայրամուտներ կամ RAK անապատի ռիթրիթներ՝ իրական գներով",
        },
        {
          title: "Պահիր Google-ով",
          description:
            "Մուտք գործիր Google-ով և պահպանիր հյուրերի տվյալները, նախասիրությունները և վճարումները",
        },
        {
          title: "Հաստատի և ճանապարհվիր",
          description:
            "Ակնթարթային հաստատումներ, տրանսֆերների կազմակերպում և կոնսիերժ late check-in-ի համար",
        },
      ],
    },
    perks: {
      tag: "B2C առավելություններ UAE-ում",
      title: "Ամեն ինչ, ինչ սպասում է ուղիղ հյուրերը՝ առանց թաքնված կանոնների",
      subtitle:
        "AORYX-ը բանակցում է բոնուսները և պահպանում թափանցիկ քաղաքականություններ. Google sign-in արագացնում է կրկնակի ամրագրումները",
      items: [
        { title: "Փողոցից մինչև անապատ", body: "Դուբայ, Աբու Դաբի և հյուսիսային էմիրաթների ընտրանի" },
        { title: "Թափանցիկ գներ", body: "Բոլոր հարկերը ներառված են, ճկուն չեղարկումներ" },
        { title: "Կոնսիերժ հայերեն/անգլերեն", body: "Տրանսֆեր, ուշ դուրսգրում, ռեստորանների ամրագրում" },
        { title: "Պրոֆիլներ վերադարձի համար", body: "Պահպանիր որոնումները և ամրագրիր արագ Google-ով" },
      ],
      contact: {
        title: "Սկսիր UAE ամրագրումների հոսքը",
        subtitle: "Կկապակցենք քո ստեկը և կձևավորենք հյուրի ուղին",
        button: "Նշանակել demo",
        hostTitle: "Կենդանի կոնսիերժ",
        hostSla: "Պատասխան մինչև 5 րոպե",
      },
    },
    faq: {
      tag: "Աջակցություն և անվտանգություն",
      title: "Հավատարմություն Google մուտքով, հստակ կանոններով և կենդանի հոսթերով",
      subtitle:
        "Google մուտքը արագ է և առանց գաղտնաբառի. բազմասարք միացումը պահպանում է սեսիան, իսկ յուրաքանչյուր ամրագրում աջակցվում է AORYX թիմով",
      items: [
        "Մուտք գործիր Google-ով՝ առանց նոր գաղտնաբառերի",
        "Վերադարձներն ու փոփոխությունները հետևիր AORYX պրոֆիլում",
        "Առաջնահերթ պատասխան DXB/AUH ուշ ժամանումների համար",
      ],
    },
    card: {
      from: "Սկսած",
      perNight: "/ գիշեր",
      reviews: "ստուգված կարծիք",
      cta: "Ամրագրել",
    },
    auth: {
      checking: "Ստուգում...",
      signedIn: "Մուտքագրված",
      signOut: "Ելք",
      signIn: "Մուտք",
    },
    services: {
      tag: "Մեր ծառայությունները",
      title: "Ամեն ինչ կատարյալ ճամփորդության համար",
      subtitle: "Հյուրանոցներ, ավիատոմսեր, տրանսֆերներ, էքսկուրսիաներ և թեմատիկ պարկեր՝ մեկ վայրում լավագույն արժեքներով",
      items: [
        { icon: "directions_car", title: "Տրանսֆերներ", description: "Հարմարավետ օդանավակայանի և քաղաքային տրանսֆերներ" },
        { icon: "hotel", title: "Հյուրանոցներ", description: "480+ պրեմիում ՀԱԷ հյուրանոցներ էքսկլուզիվ գներով" },
        { icon: "tour", title: "Էքսկուրսիաներ", description: "Տուրերի և յուրահատուկ փորձառությունների ընտրանի" },
        { icon: "attractions", title: "Թեմատիկ պարկեր", description: "Տոմսեր առանց հերթի լավագույն ատրակցիոններին" },
        { icon: "flight", title: "Ավիատոմսեր", description: "Լավագույն առաջարկներ տոմսերի վրա ամբողջ աշխարհում" },
      ],
    },
    bundleSave: {
      tag: "Փաթեթ և խնայեցեք",
      title: "Համակցրեք ծառայությունները և խնայեցեք մինչև 30%",
      subtitle: "Որքան շատ ամրագրեք միասին, այնքան շատ կխնայեք։ Ստեղծեք ձեր կատարյալ փաթեթը։",
      savings: "Խնայեցեք մինչև 30%",
      features: [
        { icon: "savings", title: "Լավագույն գնի երաշխիք", description: "Մենք կառաջարկեմ գինը ոչ ավելի քան մրցակիցներին" },
        { icon: "schedule", title: "Ամեն ինչ մեկ տեղում", description: "Խնայեցեք ժամանակ մեկ ամրագրմամբ" },
        { icon: "support_agent", title: "24/7 աջակցություն", description: "Անհատական կոնսիերժ ձեր ամբողջ ճամփորդության համար" },
      ],
      cta: "Ստեղծեք փաթեթ",
    },
    trustStats: {
      tag: "Վստահություն ամբողջ աշխարհում",
      title: "Միացեք հազարավոր գոհ ճամփորդներին",
      stats: [
        { value: "50,000+", label: "Գոհ հյուրեր" },
        { value: "4.9/5", label: "Միջին գնահատական" },
        { value: "24/7", label: "Աջակցություն օնլայն" },
        { value: "100%", label: "Ապահով ամրագրում" },
      ],
    },
    accessibility: {
      skipToContent: "Անցնել հիմնական բովանդակությանը",
      servicesSection: "Մեր ծառայությունների բաժինը",
      bundleSection: "Փաթեթային առաջարկների բաժինը",
      offersSection: "Հատուկ առաջարկների բաժինը",
      featuredSection: "Ընտրված հյուրանոցների բաժինը",
      stepsSection: "Ինչպես է աշխատում բաժինը",
      perksSection: "Առավելությունների բաժինը",
      faqSection: "Հաճախ տրվող հարցերի բաժինը",
    },
  },
  en: {
    localeLabel: "EN",
    nav: [
      { href: "#featured", label: "Featured stays" },
      { href: "#offers", label: "Special offers" },
      { href: "#perks", label: "Perks" },
    ],
    labels: { numbers: "Numbers that hold up", exclusive: "Exclusive", tripIdeas: "Trip ideas" },
    hero: {
      title: "UAE hotel exclusives, held directly from tour operator.",
      subtitle:
        "The homepage is built for booking: start with search, scan live banners, and grab AORYX-only perks across Dubai, Abu Dhabi, and the northern emirates.",
      highlightA: {
        title: "Instant availability",
        body: "See real-time rates before you commit",
      },
      highlightB: {
        title: "Exclusive banners",
        body: "Daily curated UAE offers for AORYX guests",
      },
      support: {
        title: "Need something custom?",
        body: "Group requests, extended stays, and staycations handled by AORYX hosts",
        action: "24/7 UAE support — speak with a host",
      },
      tripIdea: {
        body: "Weekend in Dubai Creek? Stay by Al Seef, add abra transfers, and keep late checkout on us.",
      },
      stats: [
        { label: "UAE stays live", value: "480+" },
        { label: "Avg. uplift", value: "18% ADR" },
        { label: "Response SLA", value: "<5 min" },
        { label: "Emirates", value: "7" },
      ],
      marquee: " STAYS  ✦  TRANSFERS  ✦  THEME PARK TICKETS  ✦  EXCURSIONS  ✦ ",
    },
    search: {
      wherePlaceholder: "City, landmark, or hotel",
      loadingDestinations: "Loading destinations...",
      locationsError: "Failed to load destinations",
      noLocations: "No destinations or hotels found",
      adultsLabel: "Adult(s)",
      childrenLabel: "Child(ren)",
      childrenAges: "Child age",
      defaultGuests: 2,
      submitIdle: "Search",
      submitLoading: "Searching...",
    },
    exclusives: {
      tag: "Banners & exclusives",
      title: "Curated UAE offers",
      subtitle: "Grab limited drops across Dubai, Abu Dhabi, and Ras Al Khaimah",
      cta: "See all offers",
      offers: [
        {
          title: "Dubai Marina flash sale",
          badge: "-18% this week",
          description: "Sunrise suites, rooftop pools, and marina views—limited nightly rates.",
          cta: "View Dubai Marina stays",
        },
        {
          title: "Abu Dhabi cultural escape",
          badge: "Museums & dunes",
          description: "Saadiyat villas with breakfast, late checkout, and Louvre access add-ons.",
          cta: "See Abu Dhabi offers",
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
      tag: "Featured in the UAE",
      title: "Stays with perks baked in",
      subtitle: "Pre-negotiated extras, flexible cancellation, and instant confirmations",
      cta: "See all emirates",
    },
    steps: {
      tag: "How booking flows",
      items: [
        {
          title: "Search by vibe",
          description:
            "Dubai Marina rooftops, Saadiyat sunsets, or Ras Al Khaimah desert retreats—see live rates instantly.",
        },
        {
          title: "Hold with Google",
          description:
            "Sign in with Google to save guests, preferences, and payment for frictionless UAE bookings.",
        },
        {
          title: "Confirm & arrive",
          description:
            "Instant confirmations, transfer coordination, and concierge chat for upgrades or late arrivals.",
        },
      ],
    },
    perks: {
      tag: "B2C perks in the UAE",
      title: "Everything direct guests expect—without hidden rules",
      subtitle:
        "AORYX negotiates extras and keeps policies transparent. Google sign-in speeds repeat bookings.",
      items: [
        { title: "Beach, city, desert", body: "Curated Dubai, Abu Dhabi, and northern emirates inventory" },
        { title: "Transparent pricing", body: "Tax-inclusive rates and flexible policies" },
        { title: "Concierge Arabic/English", body: "Airport pickups, late checkout, and dining bookings" },
        { title: "Return-ready profiles", body: "Save searches and rebook faster with Google" },
      ],
      contact: {
        title: "Launch your UAE booking flow",
        subtitle: "We’ll co-design the guest journey and connect your stack",
        button: "Schedule a demo",
        hostTitle: "Live concierge",
        hostSla: "Under 5 minutes response time",
      },
    },
    faq: {
      tag: "Support & security",
      title: "Built with trust: secure auth, clear policies, human support",
      subtitle:
        "Google sign-in powers fast, passwordless access. Multi-device continuity keeps guests logged in, and every reservation is backed by AORYX support.",
      items: [
        "Use Google to join or sign in; no separate passwords.",
        "Track refunds and changes directly in your AORYX guest profile.",
        "Priority routing to hosts for late arrivals from DXB or AUH.",
      ],
    },
    card: {
      from: "From",
      perNight: "/ night",
      reviews: "verified reviews",
      cta: "Hold room",
    },
    auth: {
      checking: "Checking status…",
      signedIn: "Signed in",
      signOut: "Sign out",
      signIn: "Sign in",
    },
    services: {
      tag: "Our Services",
      title: "Everything You Need for Your Perfect Trip",
      subtitle: "Hotels, flights, transfers, excursions, and theme parks — all in one place with the best prices",
      items: [
        { icon: "hotel", title: "Hotels", description: "480+ premium UAE properties with exclusive rates" },
        { icon: "flight", title: "Flights", description: "Best deals on air tickets worldwide" },
        { icon: "directions_car", title: "Transfers", description: "Comfortable airport and city transfers" },
        { icon: "tour", title: "Excursions", description: "Curated tours and unique experiences" },
        { icon: "attractions", title: "Theme Parks", description: "Skip-the-line tickets to top attractions" },
      ],
    },
    bundleSave: {
      tag: "Bundle & Save",
      title: "Combine Services and Save Up to 30%",
      subtitle: "The more you book together, the more you save. Create your perfect package deal.",
      savings: "Save up to 30%",
      features: [
        { icon: "savings", title: "Best Price Guarantee", description: "We match or beat any comparable offer" },
        { icon: "schedule", title: "One-Stop Booking", description: "Save time with a single reservation" },
        { icon: "support_agent", title: "24/7 Support", description: "Dedicated concierge for your entire trip" },
      ],
      cta: "Build Your Package",
    },
    trustStats: {
      tag: "Trusted Worldwide",
      title: "Join Thousands of Happy Travelers",
      stats: [
        { value: "50,000+", label: "Happy Guests" },
        { value: "4.9/5", label: "Average Rating" },
        { value: "24/7", label: "Support Available" },
        { value: "100%", label: "Secure Booking" },
      ],
    },
    accessibility: {
      skipToContent: "Skip to main content",
      servicesSection: "Our services section",
      bundleSection: "Bundle and save section",
      offersSection: "Special offers section",
      featuredSection: "Featured hotels section",
      stepsSection: "How it works section",
      perksSection: "Benefits section",
      faqSection: "FAQ section",
    },
  },
  ru: {
    localeLabel: "Рус",
    nav: [
      { href: "#featured", label: "Подборка отелей" },
      { href: "#offers", label: "Специальные предложения" },      
      { href: "#perks", label: "Преимущества" },
    ],
    labels: { numbers: "Цифры", exclusive: "Эксклюзив", tripIdeas: "Идеи поездок" },
    hero: {
      title: "Эксклюзивные цены на отели в ОАЭ от туроператора.",      
      subtitle:
        "Главная заточена под бронирование: начинай с поиска, смотри активные баннеры и бери предложения AORYX по Дубаю, Абу-Даби и северным эмиратам",
      highlightA: {
        title: "Мгновенная доступность",
        body: "Актуальные цены до подтверждения брони",
      },
      highlightB: {
        title: "Эксклюзивные баннеры",
        body: "Ежедневные подборки по ОАЭ для гостей AORYX",
      },
      support: {
        title: "Нужно что-то особенное?",
        body: "Группы, длительные заезды и staycation'ы берет на себя команда AORYX",
        action: "Поддержка 24/7 — написать хосту",
      },
      tripIdea: {
        body: "Уикенд в Dubai Creek? Живи у Al Seef, добавь трансфер на абра и поздний выезд за наш счет.",
      },
      stats: [
        { label: "Отелей в ОАЭ", value: "480+" },
        { label: "Средний рост", value: "18% ADR" },
        { label: "SLA поддержки", value: "<5 мин" },
        { label: "Эмиратов", value: "7" },
      ],
      marquee: " ОТЕЛИ  ✦  ТРАНСФЕРЫ  ✦  БИЛЕТЫ В ТЕМАТИЧЕСКИЕ ПАРКИ  ✦  ЭКСКУРСИИ  ✦ ",
    },
    search: {      
      wherePlaceholder: "Город, место или отель",
      loadingDestinations: "Загрузка направлений...",
      locationsError: "Не удалось загрузить направления",
      noLocations: "Направления или отели не найдены",
      adultsLabel: "Взрослые",
      childrenLabel: "Дети",
      childrenAges: "Возраст ребенка",
      defaultGuests: 2,
      submitIdle: "Поиск",
      submitLoading: "Поиск...",
    },
    exclusives: {
      tag: "Баннеры и эксклюзивы",
      title: "Подборка предложений по ОАЭ",
      subtitle: "Лови лимитированные офферы по Дубаю, Абу-Даби и Рас-эль-Хайме",
      cta: "Смотреть все предложения",
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
      tag: "Подборка по ОАЭ",
      title: "Отели с включенными привилегиями",
      subtitle: "Предоговоренные бонусы, гибкая отмена и мгновенные подтверждения",
      cta: "Смотреть все эмираты",
    },
    steps: {
      tag: "Как идет бронирование",
      items: [
        {
          title: "Ищи по настроению",
          description:
            "Rooftop в Marina, закаты Saadiyat или пустынные ретриты RAK — цены в реальном времени",
        },
        {
          title: "Холд через Google",
          description:
            "Войди через Google, сохраняй гостей, предпочтения и оплату для быстрых бронирований",
        },
        {
          title: "Подтверди и приезжай",
          description:
            "Мгновенные подтверждения, организация трансферов и чат с консьержем для апгрейдов",
        },
      ],
    },
    perks: {
      tag: "B2C-преимущества в ОАЭ",
      title: "Все, что ждут прямые гости — без скрытых правил",
      subtitle:
        "AORYX согласовывает бонусы и держит правила прозрачными. Вход через Google ускоряет повторы.",
      items: [
        { title: "Пляж, город, пустыня", body: "Подборка по Дубаю, Абу-Даби и северным эмиратам" },
        { title: "Прозрачные цены", body: "Налоги включены, гибкие условия" },
        { title: "Консьерж на арабском/англ.", body: "Трансферы, late checkout, бронь ресторанов" },
        { title: "Готово к повтору", body: "Сохраняй поиски и бронируй быстрее с Google" },
      ],
      contact: {
        title: "Запусти поток бронирований по ОАЭ",
        subtitle: "Настроим путь гостя и подключим твой стек",
        button: "Назначить демо",
        hostTitle: "Живой консьерж",
        hostSla: "Ответ до 5 минут",
      },
    },
    faq: {
      tag: "Поддержка и безопасность",
      title: "Надежно: Google-авторизация, понятные правила, живые люди",
      subtitle:
        "Вход через Google — быстро и без пароля. Сессия держится на всех устройствах, а каждое бронирование сопровождает команда AORYX.",
      items: [
        "Вход/регистрация через Google без новых паролей",
        "Возвраты и изменения в профиле гостя AORYX",
        "Приоритетный ответ для поздних прилетов в DXB/AUH",
      ],
    },
    card: {
      from: "От",
      perNight: "/ ночь",
      reviews: "подтвержденных отзывов",
      cta: "Удержать номер",
    },
    auth: {
      checking: "Проверка...",
      signedIn: "Вошли",
      signOut: "Выйти",
      signIn: "Войти",
    },
    services: {
      tag: "Наши услуги",
      title: "Всё для идеального путешествия",
      subtitle: "Отели, авиабилеты, трансферы, экскурсии и парки развлечений — всё в одном месте по лучшим ценам",
      items: [
        { icon: "hotel", title: "Отели", description: "480+ премиальных отелей в ОАЭ с эксклюзивными ценами" },
        { icon: "flight", title: "Авиабилеты", description: "Лучшие предложения на билеты по всему миру" },
        { icon: "directions_car", title: "Трансферы", description: "Комфортные трансферы из аэропорта и по городу" },
        { icon: "tour", title: "Экскурсии", description: "Подборка туров и уникальных впечатлений" },
        { icon: "attractions", title: "Парки развлечений", description: "Билеты без очередей в топовые парки" },
      ],
    },
    bundleSave: {
      tag: "Пакет и экономия",
      title: "Комбинируй услуги и экономь до 30%",
      subtitle: "Чем больше бронируешь вместе, тем больше экономишь. Собери свой идеальный пакет.",
      savings: "Экономия до 30%",
      features: [
        { icon: "savings", title: "Гарантия лучшей цены", description: "Мы предложим цену не выше конкурентов" },
        { icon: "schedule", title: "Всё в одном месте", description: "Экономь время с единой бронью" },
        { icon: "support_agent", title: "Поддержка 24/7", description: "Персональный консьерж на всё путешествие" },
      ],
      cta: "Собрать пакет",
    },
    trustStats: {
      tag: "Доверие по всему миру",
      title: "Присоединяйся к тысячам довольных путешественников",
      stats: [
        { value: "50,000+", label: "Довольных гостей" },
        { value: "4.9/5", label: "Средний рейтинг" },
        { value: "24/7", label: "Поддержка онлайн" },
        { value: "100%", label: "Безопасное бронирование" },
      ],
    },
    accessibility: {
      skipToContent: "Перейти к основному контенту",
      servicesSection: "Раздел наших услуг",
      bundleSection: "Раздел пакетных предложений",
      offersSection: "Раздел специальных предложений",
      featuredSection: "Раздел избранных отелей",
      stepsSection: "Раздел как это работает",
      perksSection: "Раздел преимуществ",
      faqSection: "Раздел часто задаваемых вопросов",
    },
  },
};
export function getTranslations(locale: Locale = defaultLocale): Translation {
  return translations[locale] ?? translations[defaultLocale];
}
