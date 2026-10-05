import type { PersonaSpec } from "./spec";

/**
 * P4 Ernesto, born 1958, Manila then Daly City. Window 1968 to 1988. Avoids the martial-law era.
 * Coverage here is deliberately thin (EVALS section 3 (b)): no book falls inside the original
 * Window, and the widened Window (1965 to 1991) holds a handful.
 */
export const P4: PersonaSpec = {
  id: "p4",
  seeds: ["fx-artist-nora-aunor", "fx-artist-the-carpenters", "fx-tv-eat-bulaga"],
  locations: ["Manila", "Manila, Philippines", "Manila, PH"],
  window: { min: 1968, max: 1988 },
  fingerprint: [
    "OPM", "Variety show", "Pop ballad", "Family", "Teleserye", "Filipino cinema", "Merienda", "Soft rock",
    "Kundiman", "Sitcom", "Anime classics", "Sunday mass", "Barrio fiesta", "Karaoke night", "Jeepney rides",
    "Noodles and mami", "Intramuros", "Bayanihan", "Comedy", "Romantic drama",
  ],
  music: `
Nora Aunor | OPM, Pop ballad, Filipino cinema
The Carpenters | Soft rock, Pop ballad, Family
Pilita Corrales | OPM, Pop ballad, Variety show
Vilma Santos | OPM, Filipino cinema, Variety show
Sharon Cuneta | OPM, Pop ballad, Variety show
Basil Valdez | OPM, Pop ballad, Romantic drama
Hajji Alejandro | OPM, Pop ballad, Romantic drama
Freddie Aguilar | OPM, Kundiman, Karaoke night
Rico J. Puno | OPM, Variety show, Karaoke night
Imelda Papin | OPM, Pop ballad, Karaoke night
Eddie Peregrina | OPM, Kundiman, Romantic drama
Victor Wood | OPM, Karaoke night, Romantic drama
Didith Reyes | OPM, Kundiman, Romantic drama
Celeste Legaspi | OPM, Pop ballad, Variety show
Gary Valenciano | OPM, Pop ballad, Variety show
Regine Velasquez | OPM, Pop ballad, Karaoke night
VST & Company | OPM, Barrio fiesta, Variety show
Apo Hiking Society | OPM, Comedy, Karaoke night
Juan de la Cruz Band | OPM, Barrio fiesta
ABBA | Soft rock, Pop ballad, Karaoke night
Bee Gees | Soft rock, Pop ballad, Barrio fiesta
Barry Manilow | Soft rock, Pop ballad, Karaoke night
John Denver | Soft rock, Family
Neil Diamond | Soft rock, Pop ballad
Dionne Warwick | Pop ballad, Romantic drama
Engelbert Humperdinck | Pop ballad, Romantic drama
Olivia Newton-John | Soft rock, Pop ballad
Air Supply | Soft rock, Pop ballad, Karaoke night
Lionel Richie | Pop ballad, Romantic drama
Martial Law Marching Band | OPM, Bayanihan
`,
  film: `
Ang Panday | 1980 | Filipino cinema, Comedy, Bayanihan
Himala | 1982 | Filipino cinema, Sunday mass, Barrio fiesta
Maynila sa mga kuko ng liwanag | 1975 | Filipino cinema, Intramuros, Jeepney rides
Insiang | 1976 | Filipino cinema, Barrio fiesta
Jaguar | 1979 | Filipino cinema, Jeepney rides
Bona | 1980 | Filipino cinema, Romantic drama
Kisapmata | 1981 | Filipino cinema, Family
Batch '81 | 1982 | Filipino cinema, Comedy
Karnal | 1983 | Filipino cinema, Sunday mass
Dyesebel | 1973 | Filipino cinema, Family, Romantic drama
Bituing walang ningning | 1985 | Filipino cinema, Variety show, Romantic drama
Tubog sa ginto | 1971 | Filipino cinema, Romantic drama
Ibong Adarna | 1971 | Filipino cinema, Family, Bayanihan
Star Wars | 1977 | Family
The Godfather | 1972 | Family
Jaws | 1975 | Family
Grease | 1978 | Soft rock, Karaoke night
Saturday Night Fever | 1977 | Soft rock, Karaoke night
Rocky | 1976 | Family
Superman | 1978 | Family
Raiders of the Lost Ark | 1981 | Family
E.T. the Extra-Terrestrial | 1982 | Family
Back to the Future | 1985 | Family, Comedy
Top Gun | 1986 | Romantic drama
Enter the Dragon | 1973 | Family
Love Story | 1970 | Romantic drama, Pop ballad
Dirty Harry | 1971 | Family
The Karate Kid | 1984 | Family
Ghostbusters | 1984 | Comedy, Family
Footloose | 1984 | Soft rock, Karaoke night
Dirty Dancing | 1987 | Romantic drama, Pop ballad
Platoon | 1986 | War
Beverly Hills Cop | 1984 | Comedy
The Sound of Music | 1965 | Family, Sunday mass
Gumapang ka sa lusak | 1990 | Filipino cinema, Jeepney rides
`,
  tv: `
Eat Bulaga! | 1979 | Variety show, Family, Comedy
John en Marsha | 1973 | Sitcom, Family, Comedy
GMA Supershow | 1983 | Variety show, Family, OPM
Palibhasa Lalaki | 1987 | Sitcom, Comedy
Okey Ka, Fairy Ko! | 1987 | Sitcom, Comedy, Family
That's Entertainment | 1986 | Variety show, Family, OPM
Flordeluna | 1976 | Teleserye, Family
Mission: Impossible | 1966 | Family
The Brady Bunch | 1969 | Sitcom, Family
Happy Days | 1974 | Sitcom, Family, Soft rock
Charlie's Angels | 1976 | Family
The Six Million Dollar Man | 1974 | Family
The Bionic Woman | 1976 | Family
Wonder Woman | 1975 | Family
Dallas | 1978 | Teleserye, Romantic drama
Dynasty | 1981 | Teleserye, Romantic drama
The Love Boat | 1977 | Romantic drama, Family
Fantasy Island | 1977 | Romantic drama
Kung Fu | 1972 | Family
Voltes V | 1977 | Anime classics, Family, Bayanihan
Mazinger Z | 1972 | Anime classics, Family
Daimos | 1978 | Anime classics, Family
Mobile Suit Gundam | 1979 | Anime classics
Candy Candy | 1976 | Anime classics, Romantic drama
Heidi | 1974 | Anime classics, Family
Sesame Street | 1969 | Family
Three's Company | 1977 | Sitcom, Comedy
The Muppet Show | 1976 | Variety show, Comedy, Family
Knight Rider | 1982 | Family
The A-Team | 1983 | Family, Comedy
Cheers | 1982 | Sitcom, Comedy
The Cosby Show | 1984 | Sitcom, Family
Family Ties | 1982 | Sitcom, Family
Magnum, P.I. | 1980 | Family
The Dukes of Hazzard | 1979 | Family, Jeepney rides
M*A*S*H | 1972 | War, Sitcom
`,
  book: `
Dune | 1965 | Family
Up the Down Staircase | 1965 | Family, Comedy
In Cold Blood | 1966 | Romantic drama
Valley of the Dolls | 1966 | Romantic drama
Rosemary's Baby | 1967 | Sunday mass
The Outsiders | 1967 | Family
The Joy Luck Club | 1989 | Family, Merienda
The Remains of the Day | 1989 | Romantic drama
The Pillars of the Earth | 1989 | Sunday mass, Family
Jurassic Park | 1990 | Family
Possession | 1990 | Romantic drama
Oh, the Places You'll Go! | 1990 | Family
American Psycho | 1991 | Romantic drama
`,
  place: `
Intramuros | Intramuros, Sunday mass, Family
Rizal Park | Family, Barrio fiesta, Jeepney rides
Fort Santiago | Intramuros, Family
San Agustin Church | Sunday mass, Intramuros
Manila Cathedral | Sunday mass, Intramuros
Binondo | Noodles and mami, Merienda, Family
Quiapo Church | Sunday mass, Barrio fiesta
Cultural Center of the Philippines | Filipino cinema, Variety show, OPM
Manila Ocean Park | Family
Ayala Museum | Family
National Museum of the Philippines | Family, Intramuros
Escolta Street | Merienda, Family
Malate | Merienda, Karaoke night
Roxas Boulevard | Jeepney rides, Family
Manila Bay | Family, Jeepney rides
Chinese Garden | Family
Ongpin Street | Noodles and mami, Family
Divisoria | Barrio fiesta, Merienda, Jeepney rides
Greenhills | Family, Merienda
Araneta Coliseum | Variety show, OPM, Filipino cinema
Folk Arts Theater | Variety show, OPM, Karaoke night
Manila Hotel | Family, Intramuros, Romantic drama
Aristocrat Restaurant | Merienda, Family, Barrio fiesta
Max's Restaurant | Merienda, Family, Sunday mass
Ma Mon Luk | Noodles and mami, Merienda
Cafe Adriatico | Merienda, Karaoke night
Bahay Tsinoy | Family, Intramuros
Metropolitan Theater | Filipino cinema, Variety show, Family
Casa Manila | Intramuros, Family
`,
  brand: `
San Miguel Beer | Barrio fiesta, Karaoke night
Jollibee | Family, Merienda, Sunday mass
Max's | Family, Merienda, Sunday mass
Goldilocks | Family, Merienda
Red Ribbon | Family, Merienda
Magnolia | Family, Merienda
Datu Puti | Family, Barrio fiesta
Mang Tomas | Family, Barrio fiesta
Lucky Me! | Noodles and mami, Merienda
Chippy | Merienda, Family
Milo | Family, Merienda
Alaska | Family, Merienda
Bear Brand | Family, Merienda
Philippine Airlines | Family, Jeepney rides
Ginebra San Miguel | Barrio fiesta, Karaoke night
Tanduay | Barrio fiesta, Karaoke night
SkyFlakes | Merienda, Family
Rebisco | Merienda, Family
Ligo | Family
Silver Swan | Family
Knorr | Family
Palmolive | Family
Pond's | Family
Royal Tru-Orange | Merienda, Family
Coca-Cola | Family, Barrio fiesta
Pepsi | Family, Barrio fiesta
Shakey's | Family, Karaoke night
Greenwich Pizza | Family, Merienda
Mister Donut | Merienda, Family
Mama Sita's | Family, Barrio fiesta
`,
};
