// Aoryx API Types

// Room search configuration
export interface AoryxRoomSearch {
  roomIdentifier: number;
  adults: number;
  childrenAges: number[];
}

// Search parameters (frontend-friendly format)
export interface AoryxSearchParams {
  destinationCode?: string;
  hotelCode?: string;
  countryCode: string;
  nationality: string;
  checkInDate: string;
  checkOutDate: string;
  currency?: string;
  regionId?: string;
  customerCode?: string;
  rooms: AoryxRoomSearch[];
}

// Room occupancy for API request
export interface AoryxChildAge {
  Identifier: number;
  Text: string;
}

export interface AoryxRoomChildren {
  Count: number;
  ChildAge: AoryxChildAge[];
}

export interface AoryxRoomOccupancy {
  RoomIdentifier: number;
  Adult: number; // API uses "Adult" (singular)
  Children?: AoryxRoomChildren; // Optional children with Count and ChildAge array
}

// API Request types
export interface AoryxSearchParameter {
  DestinationCode?: string;
  HotelCode?: string;
  CountryCode: string;
  Nationality: string;
  Currency: string;
  CheckInDate: string;
  CheckOutDate: string;
  Rooms: {
    Room: AoryxRoomOccupancy[]; // Must always be an array
  };
  TassProInfo?: {
    CustomerCode?: string;
    RegionID?: string;
  };
}

export interface AoryxSearchRequest {
  GeneralInfo?: {
    ApiKey?: string;
    CustomerCode?: string;
  };
  SearchParameter: AoryxSearchParameter;
}

// Hotel info types (API response uses camelCase)
export interface AoryxHotelsInfoItem {
  destinationId?: string | null;
  name?: string | null;
  systemId?: string | null;
  rating?: number | null;
  city?: string | null;
  address1?: string | null;
  imageUrl?: string | null;
  geoCode?: {
    lat?: number | null;
    lon?: number | null;
  } | null;
  [key: string]: unknown;
}

export interface AoryxHotelsInfoByDestinationIdRequest {
  destinationId: string;
}

export interface AoryxHotelsInfoByDestinationIdResponse {
  isSuccess?: boolean;
  statusCode?: number;
  exceptionMessage?: string | null;
  errors?: unknown;
  hotelsInformation?: AoryxHotelsInfoItem[] | null;
  [key: string]: unknown;
}

export interface AoryxHotelInfoRequest {
  hotelCode: string;
}

export interface AoryxHotelInfoAddress {
  Line1?: string | null;
  Line2?: string | null;
  CountryCode?: string | null;
  CountryName?: string | null;
  CityName?: string | null;
  StateCode?: string | null;
  ZipCode?: string | null;
  [key: string]: unknown;
}

export interface AoryxHotelInfoGeocode {
  Lat?: number | null;
  Lon?: number | null;
}

export interface AoryxHotelInfoContact {
  PhoneNo?: string | null;
  FaxNo?: string | null;
  Website?: string | null;
}

export interface AoryxHotelInformation {
  SystemId?: string | null;
  Name?: string | null;
  Address?: AoryxHotelInfoAddress | null;
  GeoCode?: AoryxHotelInfoGeocode | null;
  Rating?: number | null;
  TripAdvisorRating?: number | null;
  TripAdvisorUrl?: string | null;
  Contact?: AoryxHotelInfoContact | null;
  CurrencyCode?: string | null;
  ImageUrl?: string | null;
  ImageUrls?: string[] | null;
  [key: string]: unknown;
}

export interface AoryxHotelInfoResponse {
  IsSuccess?: boolean;
  StatusCode?: number;
  ExceptionMessage?: string | null;
  Errors?: unknown;
  HotelInformation?: AoryxHotelInformation | null;
  [key: string]: unknown;
}

export interface AoryxRoomDetailsRequest {
  hotelCode: string;
  searchParameter: AoryxSearchParameter;
  sessionId?: string | null;
}

export interface AoryxRoomDetailItem {
  RoomCode?: string | null;
  RoomName?: string | null;
  RoomType?: string | null;
  RoomIndex?: string | number | null;
  RateKey?: string | null;
  BoardType?: string | null;
  MealType?: string | null;
  MealPlan?: string | null;
  Refundable?: boolean | string | number | null;
  IsRefundable?: boolean | string | number | null;
  NonRefundable?: boolean | string | number | null;
  Currency?: string | null;
  CurrencyCode?: string | null;
  TotalPrice?: unknown;
  Price?: unknown;
  NetRate?: unknown;
  RoomRate?: unknown;
  AvailableRooms?: number | string | null;
  CancellationPolicy?: unknown;
  [key: string]: unknown;
}

export interface AoryxRoomDetailsResponse {
  IsSuccess?: boolean;
  StatusCode?: number;
  ExceptionMessage?: string | null;
  Errors?: unknown;
  RoomDetails?: {
    RoomDetail?: AoryxRoomDetailItem | AoryxRoomDetailItem[];
  } | null;
  HotelRooms?: {
    HotelRoom?: AoryxRoomDetailItem | AoryxRoomDetailItem[];
  } | null;
  Rooms?: {
    Room?: AoryxRoomDetailItem | AoryxRoomDetailItem[];
  } | AoryxRoomDetailItem[] | null;
  [key: string]: unknown;
}

// Search response types (API response uses PascalCase)
export interface AoryxSearchHotelInfo {
  Code?: string | null;
  SpHotelCode?: string | null;
  Name?: string | null;
  Image?: string | null;
  Description?: string | null;
  StarRating?: string | null;
  Lat?: string | null;
  Lon?: string | null;
  Add1?: string | null;
  Add2?: string | null;
  City?: string | null;
  Location?: string | null;
  HotelRemarks?: string | null;
  CheckinInstruction?: string | null;
  CheckOutInstruction?: string | null;
}

export interface AoryxSearchHotel {
  Code?: string | null;
  Name?: string | null;
  GroupCode?: number | null;
  SupplierGroupCode?: number | null;
  SupplierShortCode?: string | null;
  MinPrice?: number | null;
  SupplierMinPrice?: number | null;
  SupplierCurrency?: string | null;
  HotelInfo?: AoryxSearchHotelInfo | null;
  Rooms?: unknown;
}

export interface AoryxSearchResponse {
  GeneralInfo?: {
    SessionId?: string | null;
    [key: string]: unknown;
  };
  Monetary?: {
    Currency?: {
      Code?: string | null;
    };
  };
  Audit?: {
    PropertyCount?: number | null;
    ResponseTime?: string | null;
    Destination?: {
      Code?: string | null;
      Text?: string | null;
    } | null;
  };
  Hotels?: {
    Hotel?: AoryxSearchHotel | AoryxSearchHotel[];
  };
  IsSuccess?: boolean;
  StatusCode?: number;
  ExceptionMessage?: string | null;
  Errors?: unknown;
  [key: string]: unknown;
}

// Normalized result types (for frontend)
export interface AoryxHotelSummary {
  code: string | null;
  name: string | null;
  minPrice: number | null;
  currency: string | null;
  rating: number | null;
  address: string | null;
  city: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface AoryxSearchResult {
  sessionId: string;
  currency: string | null;
  propertyCount: number | null;
  responseTime: string | null;
  destination: {
    code: string | null;
    name: string | null;
  } | null;
  hotels: AoryxHotelSummary[];
}

// Hotel info normalized
export interface HotelInfo {
  destinationId: string | null;
  name: string | null;
  systemId: string | null;
  rating: number | null;
  city: string | null;
  address: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface AoryxHotelInfoResult {
  systemId: string | null;
  name: string | null;
  rating: number | null;
  tripAdvisorRating: number | null;
  tripAdvisorUrl: string | null;
  currencyCode: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  address: {
    line1: string | null;
    line2: string | null;
    countryCode: string | null;
    countryName: string | null;
    cityName: string | null;
    stateCode: string | null;
    zipCode: string | null;
  } | null;
  geoCode: {
    lat: number | null;
    lon: number | null;
  } | null;
  contact: {
    phone: string | null;
    fax: string | null;
    website: string | null;
  } | null;
}

export interface AoryxRoomOption {
  id: string;
  name: string | null;
  boardType: string | null;
  refundable: boolean | null;
  currency: string | null;
  totalPrice: number | null;
  availableRooms: number | null;
  cancellationPolicy: string | null;
}
