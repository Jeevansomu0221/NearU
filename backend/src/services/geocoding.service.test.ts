import { parseGoogleReverseResults } from "./geocoding.service";

const component = (long_name: string, ...types: string[]) => ({ long_name, short_name: long_name, types });

describe("parseGoogleReverseResults", () => {
  const latitude = 17.3512;
  const longitude = 78.3874;

  it("prefers West End Colony and Hyderabad over a misspelled nearby road and Rangareddy", () => {
    const parsed = parseGoogleReverseResults(
      [
        {
          types: ["plus_code"],
          formatted_address: "7QQX+XX Hydershakote, Hyderabad, Telangana, India",
          geometry: { location: { lat: latitude, lng: longitude }, location_type: "APPROXIMATE" },
          address_components: [component("7QQX+XX", "plus_code")]
        },
        {
          types: ["route"],
          formatted_address: "Himgiry Nagar Colony Road, Himagiri Nagar, Hydershakote, Rangareddy, Telangana, India",
          geometry: { location: { lat: latitude, lng: longitude }, location_type: "GEOMETRIC_CENTER" },
          address_components: [
            component("Himgiry Nagar Colony Road", "route"),
            component("Himagiri Nagar", "neighborhood", "political"),
            component("Hydershakote", "sublocality_level_1", "sublocality", "political"),
            component("Rangareddy", "administrative_area_level_3", "political"),
            component("Ranga Reddy", "administrative_area_level_2", "political"),
            component("Telangana", "administrative_area_level_1", "political"),
            component("India", "country", "political")
          ]
        },
        {
          types: ["neighborhood", "political"],
          formatted_address: "Himagiri Nagar, Hydershakote, Hyderabad, Telangana, India",
          geometry: { location: { lat: latitude, lng: longitude }, location_type: "APPROXIMATE" },
          address_components: [
            component("Himagiri Nagar", "neighborhood", "political"),
            component("Hydershakote", "sublocality_level_1", "sublocality", "political"),
            component("Hyderabad", "locality", "political"),
            component("Telangana", "administrative_area_level_1", "political"),
            component("India", "country", "political")
          ]
        },
        {
          types: ["neighborhood", "political"],
          formatted_address: "West End Colony, Hydershakote, Hyderabad, Telangana, India",
          geometry: { location: { lat: latitude, lng: longitude }, location_type: "APPROXIMATE" },
          address_components: [
            component("West End Colony", "neighborhood", "political"),
            component("Hydershakote", "sublocality_level_1", "sublocality", "political"),
            component("Hyderabad", "locality", "political"),
            component("Telangana", "administrative_area_level_1", "political"),
            component("India", "country", "political")
          ]
        },
        {
          types: ["locality", "political"],
          formatted_address: "Hyderabad, Telangana, India",
          geometry: { location: { lat: latitude, lng: longitude }, location_type: "APPROXIMATE" },
          address_components: [
            component("Hyderabad", "locality", "political"),
            component("Telangana", "administrative_area_level_1", "political"),
            component("India", "country", "political")
          ]
        }
      ],
      latitude,
      longitude
    );

    expect(parsed?.streetRoadName).toBe("");
    expect(parsed?.colony).toBe("Himagiri Nagar, West End Colony");
    expect(parsed?.area).toBe("Hydershakote");
    expect(parsed?.city).toBe("Hyderabad");
    expect(parsed?.formattedAddress).toBe(
      "Himagiri Nagar, West End Colony, Hydershakote, Hyderabad, Telangana, India"
    );
    expect(parsed?.formattedAddress).not.toMatch(/Himgiry/i);
    expect(parsed?.formattedAddress).not.toMatch(/Rangareddy/i);
  });

  it("keeps a real street name that is not just a misspelled colony", () => {
    const parsed = parseGoogleReverseResults(
      [
        {
          types: ["street_address"],
          formatted_address: "12 Chevella Road, West End Colony, Hyderabad, Telangana, India",
          geometry: { location: { lat: latitude, lng: longitude }, location_type: "ROOFTOP" },
          address_components: [
            component("12", "street_number"),
            component("Chevella Road", "route"),
            component("West End Colony", "neighborhood", "political"),
            component("Hyderabad", "locality", "political"),
            component("Telangana", "administrative_area_level_1", "political"),
            component("India", "country", "political")
          ]
        }
      ],
      latitude,
      longitude
    );

    expect(parsed?.streetRoadName).toBe("Chevella Road");
    expect(parsed?.colony).toBe("West End Colony");
    expect(parsed?.formattedAddress).toContain("Chevella Road");
    expect(parsed?.formattedAddress).toContain("West End Colony");
  });
});
