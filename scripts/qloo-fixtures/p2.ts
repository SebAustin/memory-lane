import type { PersonaSpec } from "./spec";

/** P2 Arthur, born 1935, Leeds then London. Window 1945 to 1965. Avoids the Korean War and national service. */
export const P2: PersonaSpec = {
  id: "p2",
  seeds: ["fx-artist-lonnie-donegan", "fx-film-brief-encounter", "fx-tv-coronation-street"],
  locations: ["Leeds", "Leeds, UK", "Leeds, England", "Leeds, West Yorkshire"],
  window: { min: 1945, max: 1965 },
  fingerprint: [
    "Skiffle", "British comedy", "Railways", "Working-class life", "Variety", "Trad jazz", "Seaside holidays",
    "Ealing comedy", "Romantic drama", "Big band", "Easy listening", "British pop", "Family", "Sunday roast",
    "Kitchen sink drama", "Pantomime", "Brass bands", "Tea time", "Football", "Cinema outings",
  ],
  music: `
Lonnie Donegan | Skiffle, Trad jazz, British pop
Vera Lynn | Easy listening, Big band, Tea time
Tommy Steele | British pop, Skiffle, Pantomime
Cliff Richard | British pop, Seaside holidays
The Shadows | British pop, Football
Petula Clark | British pop, Easy listening
Dusty Springfield | British pop, Variety
Shirley Bassey | Variety, Big band
Gracie Fields | Variety, Working-class life, Pantomime
Max Bygraves | Variety, Family, Seaside holidays
Dickie Valentine | Variety, Easy listening
Frankie Vaughan | Variety, Big band
Anne Shelton | Big band, Easy listening
Ronnie Hilton | Easy listening, Variety
Matt Monro | Easy listening, Big band
The Beatles | British pop, Football, Working-class life
Adam Faith | British pop, Skiffle
Billy Fury | British pop, Seaside holidays
Frank Ifield | British pop, Easy listening
Acker Bilk | Trad jazz, Easy listening, Railways
Kenny Ball | Trad jazz, Variety
Chris Barber | Trad jazz, Skiffle
Humphrey Lyttelton | Trad jazz, Big band
Ted Heath | Big band, Easy listening
Mantovani | Easy listening, Tea time
Bert Weedon | British pop, Skiffle
Russ Conway | Easy listening, Seaside holidays
Winifred Atwell | Variety, Easy listening, Tea time
Alma Cogan | Variety, Easy listening
Black Dyke Mills Band | Brass bands, Working-class life
Grimethorpe Colliery Band | Brass bands, Working-class life, Railways
`,
  film: `
Brief Encounter | 1945 | Romantic drama, Railways, Cinema outings
The Third Man | 1949 | Romantic drama, Cinema outings
Kind Hearts and Coronets | 1949 | Ealing comedy, British comedy
Passport to Pimlico | 1949 | Ealing comedy, British comedy, Working-class life
Whisky Galore! | 1949 | Ealing comedy, British comedy
The Lavender Hill Mob | 1951 | Ealing comedy, British comedy
The Ladykillers | 1955 | Ealing comedy, British comedy, Railways
Genevieve | 1953 | British comedy, Cinema outings
Doctor in the House | 1954 | British comedy, Family
The Titfield Thunderbolt | 1953 | Ealing comedy, Railways, British comedy
The Belles of St Trinian's | 1954 | British comedy, Family
Hobson's Choice | 1954 | British comedy, Working-class life
Great Expectations | 1946 | Romantic drama, Family
Oliver Twist | 1948 | Romantic drama, Working-class life
The Red Shoes | 1948 | Romantic drama, Cinema outings
A Matter of Life and Death | 1946 | Romantic drama
Blithe Spirit | 1945 | British comedy, Romantic drama
Carry On Teacher | 1959 | British comedy, Family
Carry On Nurse | 1959 | British comedy
I'm All Right Jack | 1959 | British comedy, Working-class life
Room at the Top | 1959 | Kitchen sink drama, Working-class life
Saturday Night and Sunday Morning | 1960 | Kitchen sink drama, Working-class life
A Taste of Honey | 1961 | Kitchen sink drama, Seaside holidays
The Loneliness of the Long Distance Runner | 1962 | Kitchen sink drama, Football
Lawrence of Arabia | 1962 | Cinema outings
Dr. No | 1962 | Cinema outings
Tom Jones | 1963 | British comedy, Cinema outings
A Hard Day's Night | 1964 | British pop, Railways, British comedy
Goldfinger | 1964 | Cinema outings
Mary Poppins | 1964 | Family, Pantomime
My Fair Lady | 1964 | Family, Cinema outings
Zulu | 1964 | Cinema outings
The Cruel Sea | 1953 | War, Cinema outings
The Dam Busters | 1955 | War, Cinema outings
Reach for the Sky | 1956 | War, Cinema outings
Casablanca | 1942 | Romantic drama, Cinema outings
Oliver! | 1968 | Family, Working-class life, Pantomime
The Italian Job | 1969 | British comedy
`,
  tv: `
Coronation Street | 1960 | Working-class life, Family, Kitchen sink drama
Dixon of Dock Green | 1955 | Working-class life, Family
Hancock's Half Hour | 1956 | British comedy, Working-class life
Sunday Night at the London Palladium | 1955 | Variety, Pantomime, Family
Take Your Pick | 1955 | Variety, Family
Double Your Money | 1955 | Variety, Family
Armchair Theatre | 1956 | Kitchen sink drama
Emergency - Ward 10 | 1957 | Family, Kitchen sink drama
Z-Cars | 1962 | Working-class life, Football
Doctor Who | 1963 | Family, Railways
Steptoe and Son | 1962 | British comedy, Working-class life
That Was the Week That Was | 1962 | British comedy, Variety
Top of the Pops | 1964 | British pop, Variety
The Avengers | 1961 | Cinema outings
The Saint | 1962 | Cinema outings
Crossroads | 1964 | Family, Working-class life
Juke Box Jury | 1959 | British pop, Variety
Six-Five Special | 1957 | Skiffle, British pop, Variety
Oh Boy! | 1958 | British pop, Variety
Thank Your Lucky Stars | 1961 | British pop, Variety
Ready Steady Go! | 1963 | British pop, Variety
Blue Peter | 1958 | Family, Railways
Andy Pandy | 1950 | Family, Tea time
Muffin the Mule | 1946 | Family, Tea time
Bill and Ben the Flowerpot Men | 1952 | Family, Tea time
Panorama | 1953 | Family
What's My Line? | 1951 | Variety, Family
Face to Face | 1959 | Family
Whicker's World | 1958 | Seaside holidays, Family
The Rag Trade | 1961 | British comedy, Working-class life
The Army Game | 1957 | British comedy, Working-class life
The Black and White Minstrel Show | 1958 | Variety, Family
Match of the Day | 1964 | Football, Family
Hancock | 1963 | British comedy
Tonight | 1957 | Family, Variety
The Flower Pot Men | 1952 | Family
Peyton Place | 1964 | Family
Till Death Us Do Part | 1966 | British comedy, Working-class life
The Prisoner | 1967 | Cinema outings
Dad's Army | 1968 | War, British comedy
`,
  book: `
Nineteen Eighty-Four | 1949 | Working-class life
Animal Farm | 1945 | Working-class life, Family
Lord of the Flies | 1954 | Family
The Lord of the Rings | 1954 | Family
Casino Royale | 1953 | Cinema outings
Dr. No | 1958 | Cinema outings
Goldfinger | 1959 | Cinema outings
Brideshead Revisited | 1945 | Romantic drama
The End of the Affair | 1951 | Romantic drama, Railways
Our Man in Havana | 1958 | British comedy
Lucky Jim | 1954 | British comedy, Kitchen sink drama
Room at the Top | 1957 | Kitchen sink drama, Working-class life
Saturday Night and Sunday Morning | 1958 | Kitchen sink drama, Working-class life
A Kind of Loving | 1960 | Kitchen sink drama, Working-class life
The Loneliness of the Long Distance Runner | 1959 | Kitchen sink drama, Football
The Day of the Triffids | 1951 | Railways
A Bear Called Paddington | 1958 | Family, Railways, Tea time
Three Railway Engines | 1945 | Railways, Family
Thomas the Tank Engine | 1946 | Railways, Family
James the Red Engine | 1948 | Railways, Family
The Little Old Engine | 1959 | Railways
Chitty-Chitty-Bang-Bang | 1964 | Family
Charlie and the Chocolate Factory | 1964 | Family
The Prime of Miss Jean Brodie | 1961 | Romantic drama
The Spy Who Came in from the Cold | 1963 | Railways
Under Milk Wood | 1954 | Seaside holidays, Working-class life
Cider with Rosie | 1959 | Family, Sunday roast
A Clockwork Orange | 1962 | Working-class life
The Go-Between | 1953 | Romantic drama
Five on a Treasure Island | 1942 | Family, Seaside holidays
The Cruel Sea | 1951 | War
Reach for the Sky | 1954 | War
The Wombles | 1968 | Family
Fanny Cradock Cooks for Christmas | 1970 | Sunday roast, Tea time
Elizabeth David's French Provincial Cooking | 1960 | Sunday roast
`,
  place: `
Kirkgate Market | Working-class life, Tea time, Sunday roast
Leeds Town Hall | Brass bands, Variety, Cinema outings
Roundhay Park | Family, Seaside holidays, Brass bands
Temple Newsam | Family, Sunday roast
Kirkstall Abbey | Family, Railways
Leeds Grand Theatre and Opera House | Pantomime, Variety, Cinema outings
Whitelock's Ale House | Working-class life, Sunday roast
Harry Ramsden's | Seaside holidays, Family, Sunday roast
Lotherton Hall | Family, Tea time
Harewood House | Family, Tea time
Headingley Cricket Ground | Football, Family
Elland Road | Football, Working-class life
Leeds Corn Exchange | Working-class life, Tea time
Leeds City Museum | Family
Armley Mills Industrial Museum | Working-class life, Railways
Golden Acre Park | Family, Brass bands
Tropical World | Family, Seaside holidays
Leeds Central Library | Family
Bramham Park | Family, Tea time
Ilkley Moor | Family, Seaside holidays
Bolton Abbey | Family, Railways, Tea time
Salts Mill | Working-class life, Railways
Fountains Abbey | Family, Tea time
Bettys Cafe Tea Rooms | Tea time, Sunday roast
Keighley and Worth Valley Railway | Railways, Family
Leeds Station | Railways, Cinema outings
Thackray Museum of Medicine | Working-class life, Family
`,
  brand: `
Cadbury | Family, Tea time
Rowntree's | Family, Tea time, Working-class life
Hovis | Working-class life, Family
Bovril | Working-class life, Football
Typhoo | Tea time, Family
PG Tips | Tea time, Family
Brylcreem | Cinema outings, Football
Lyons Corner House | Tea time, Variety
Marks & Spencer | Family, Sunday roast
Woolworths | Family, Working-class life
Boots | Family
HP Sauce | Sunday roast, Working-class life
Heinz | Family, Tea time
Bird's Custard | Sunday roast, Family
Ovaltine | Family, Tea time
Horlicks | Family, Tea time
Marmite | Working-class life, Tea time
Kellogg's | Family
Raleigh | Working-class life, Seaside holidays
Hornby | Railways, Family
Meccano | Railways, Family
Dinky Toys | Railways, Family
Austin | Seaside holidays, Family
Morris | Seaside holidays, Family
Murphy Radio | Easy listening, Family
Ekco | Easy listening, Family
Kodak | Seaside holidays, Family
Guinness | Working-class life, Football
Tetley | Working-class life, Tea time
Fox's Glacier Mints | Family, Seaside holidays
Mackintosh's Quality Street | Family, Tea time
Wall's Ice Cream | Seaside holidays, Family
Vimto | Family, Seaside holidays
`,
};
