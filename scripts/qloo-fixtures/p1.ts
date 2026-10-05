import type { PersonaSpec } from "./spec";

/** P1 Margaret, born 1946, Memphis. Window 1956 to 1976. Avoids the Vietnam War and "Tennessee Waltz". */
export const P1: PersonaSpec = {
  id: "p1",
  seeds: ["fx-artist-patsy-cline", "fx-film-pillow-talk", "fx-film-move-over-darling"],
  locations: ["Memphis", "Memphis, TN", "Memphis, Tennessee"],
  window: { min: 1956, max: 1976 },
  fingerprint: [
    "Country", "Nashville sound", "Romantic comedy", "Traditional pop", "Southern heritage", "Easy listening",
    "Memphis sound", "Family", "Rock and roll", "Glamour", "Soul", "Gospel roots", "Honky-tonk", "Musical",
    "Sitcom", "Variety show", "Barbecue", "Sunday best", "Road trips", "Dance halls",
  ],
  music: `
Patsy Cline | Country, Nashville sound
Tennessee Waltz Revue | Country, Easy listening
Loretta Lynn | Country, Honky-tonk, Nashville sound
Brenda Lee | Traditional pop, Rock and roll, Nashville sound
Skeeter Davis | Country, Nashville sound, Traditional pop
Kitty Wells | Country, Honky-tonk
Jim Reeves | Country, Nashville sound, Easy listening
Connie Francis | Traditional pop, Pop vocal
Elvis Presley | Rock and roll, Country, Memphis sound
Johnny Cash | Country, Rock and roll, Memphis sound
Dolly Parton | Country, Nashville sound
Roy Orbison | Rock and roll, Traditional pop, Memphis sound
Eddy Arnold | Country, Nashville sound, Easy listening
Marty Robbins | Country, Traditional pop
Nat King Cole | Traditional pop, Easy listening
Perry Como | Traditional pop, Easy listening
Carla Thomas | Soul, Memphis sound
Sam Cooke | Soul, Gospel roots
Otis Redding | Soul, Memphis sound
Aretha Franklin | Soul, Gospel roots
Jerry Lee Lewis | Rock and roll, Memphis sound, Country
Ray Price | Country, Honky-tonk
Doris Day | Traditional pop, Easy listening, Romantic comedy
Rufus Thomas | Soul, Memphis sound, Dance halls
Mahalia Jackson | Gospel roots, Soul, Sunday best
The Louvin Brothers | Country, Gospel roots
Booker T. & the M.G.'s | Soul, Memphis sound, Road trips
`,
  film: `
Pillow Talk | 1959 | Romantic comedy, Glamour
Move Over, Darling | 1963 | Romantic comedy, Family
Lover Come Back | 1961 | Romantic comedy, Glamour
That Touch of Mink | 1962 | Romantic comedy, Glamour
The Pajama Game | 1957 | Musical, Dance halls
Calamity Jane | 1953 | Musical, Western
Teacher's Pet | 1958 | Romantic comedy, Family
Please Don't Eat the Daisies | 1960 | Family, Romantic comedy
Send Me No Flowers | 1964 | Romantic comedy, Sitcom
Love Me or Leave Me | 1955 | Musical, Glamour
Jumbo | 1962 | Musical, Family
Where Were You When the Lights Went Out? | 1968 | Romantic comedy, Sitcom
With Six You Get Eggroll | 1968 | Family, Sitcom
Breakfast at Tiffany's | 1961 | Romantic comedy, Glamour
Roman Holiday | 1953 | Romantic comedy, Road trips
Some Like It Hot | 1959 | Romantic comedy, Glamour
Gigi | 1958 | Musical, Glamour
South Pacific | 1958 | Musical, Romantic comedy
The Music Man | 1962 | Musical, Family
West Side Story | 1961 | Musical, Dance halls
My Fair Lady | 1964 | Musical, Glamour
The Sound of Music | 1965 | Musical, Family
Mary Poppins | 1964 | Musical, Family
Bye Bye Birdie | 1963 | Musical, Rock and roll, Family
Blue Hawaii | 1961 | Rock and roll, Road trips
Love Me Tender | 1956 | Rock and roll, Western
Jailhouse Rock | 1957 | Rock and roll, Memphis sound
Viva Las Vegas | 1964 | Rock and roll, Dance halls
To Kill a Mockingbird | 1962 | Southern heritage, Drama
Cat on a Hot Tin Roof | 1958 | Southern heritage, Drama
In the Heat of the Night | 1967 | Southern heritage, Drama
Nashville | 1975 | Country, Southern heritage
The Apartment | 1960 | Romantic comedy, Drama
Operation Petticoat | 1959 | Romantic comedy, Sitcom
Hello, Dolly! | 1969 | Musical, Glamour
Funny Girl | 1968 | Musical, Glamour
Butch Cassidy and the Sundance Kid | 1969 | Western, Road trips
The Bridge on the River Kwai | 1957 | War, Drama
Apocalypse Now | 1979 | War, Drama
Smokey and the Bandit | 1977 | Road trips, Southern heritage
Grease | 1978 | Musical, Rock and roll
Coal Miner's Daughter | 1980 | Country, Southern heritage
`,
  tv: `
The Andy Griffith Show | 1960 | Sitcom, Southern heritage, Family
The Dick Van Dyke Show | 1961 | Sitcom, Family
The Beverly Hillbillies | 1962 | Sitcom, Country, Southern heritage
Hee Haw | 1969 | Country, Variety show, Southern heritage
The Johnny Cash Show | 1969 | Country, Variety show
The Doris Day Show | 1968 | Sitcom, Family, Traditional pop
Bewitched | 1964 | Sitcom, Family
The Lawrence Welk Show | 1955 | Variety show, Easy listening, Sunday best
The Danny Thomas Show | 1953 | Sitcom, Family
Leave It to Beaver | 1957 | Sitcom, Family
Gunsmoke | 1955 | Western, Drama
Bonanza | 1959 | Western, Family
The Flintstones | 1960 | Sitcom, Family
Gilligan's Island | 1964 | Sitcom, Road trips
Green Acres | 1965 | Sitcom, Southern heritage
Petticoat Junction | 1963 | Sitcom, Country, Family
I Dream of Jeannie | 1965 | Sitcom, Glamour
The Carol Burnett Show | 1967 | Variety show, Sitcom
Rowan & Martin's Laugh-In | 1967 | Variety show
The Brady Bunch | 1969 | Sitcom, Family
The Partridge Family | 1970 | Sitcom, Family, Rock and roll
The Waltons | 1972 | Family, Southern heritage, Drama
Little House on the Prairie | 1974 | Family, Drama
Happy Days | 1974 | Sitcom, Family, Rock and roll
Sanford and Son | 1972 | Sitcom
The Mary Tyler Moore Show | 1970 | Sitcom, Glamour
All in the Family | 1971 | Sitcom, Family
Sing Along with Mitch | 1961 | Variety show, Easy listening
The Monkees | 1966 | Sitcom, Rock and roll
Perry Mason | 1957 | Drama
The Twilight Zone | 1959 | Drama
Star Trek | 1966 | Drama, Road trips
General Hospital | 1963 | Drama
M*A*S*H | 1972 | War, Sitcom
Charlie's Angels | 1976 | Drama, Glamour
Captain Kangaroo | 1955 | Family
`,
  book: `
To Kill a Mockingbird | 1960 | Southern heritage, Family
Peyton Place | 1956 | Drama, Southern heritage
Breakfast at Tiffany's | 1958 | Romantic comedy, Glamour
Valley of the Dolls | 1966 | Glamour, Drama
The Godfather | 1969 | Drama, Family
Love Story | 1970 | Romantic comedy, Drama
Jonathan Livingston Seagull | 1970 | Road trips
Coal Miner's Daughter | 1976 | Country, Southern heritage, Honky-tonk
Man in Black | 1975 | Country, Gospel roots
Stand by Your Man | 1979 | Country, Nashville sound
The Cat in the Hat | 1957 | Family
How the Grinch Stole Christmas! | 1957 | Family, Sunday best
Green Eggs and Ham | 1960 | Family
Where the Red Fern Grows | 1961 | Family, Southern heritage
A Wrinkle in Time | 1962 | Family
Charlie and the Chocolate Factory | 1964 | Family
Where the Wild Things Are | 1963 | Family
The Giving Tree | 1964 | Family
Betty Crocker's Cookbook | 1969 | Barbecue, Family, Sunday best
Hawaii | 1959 | Road trips, Drama
Exodus | 1958 | Drama
Catch-22 | 1961 | War, Drama
Slaughterhouse-Five | 1969 | War, Drama
Rabbit, Run | 1960 | Drama
The Outsiders | 1967 | Rock and roll, Drama
Go Ask Alice | 1971 | Drama
One Flew Over the Cuckoo's Nest | 1962 | Drama
The Bell Jar | 1963 | Drama
In Cold Blood | 1966 | Drama, Southern heritage
The Exorcist | 1971 | Drama
Jaws | 1974 | Road trips, Drama
Roots | 1976 | Southern heritage, Family, Drama
The Thorn Birds | 1977 | Romantic comedy, Family
Beezus and Ramona | 1955 | Family
Silent Spring | 1962 | Drama
The Chosen | 1967 | Family, Drama
`,
  place: `
Graceland | Southern heritage, Rock and roll, Memphis sound
Sun Studio | Memphis sound, Rock and roll, Country
Stax Museum of American Soul Music | Soul, Memphis sound
Beale Street | Soul, Dance halls, Memphis sound
The Peabody Hotel | Glamour, Southern heritage, Sunday best
Gus's World Famous Fried Chicken | Southern heritage, Family, Sunday best
Charlie Vergos' Rendezvous | Barbecue, Southern heritage
The Arcade Restaurant | Southern heritage, Family, Rock and roll
Central BBQ | Barbecue, Family
Corky's BBQ | Barbecue, Family
Interstate Bar-B-Que | Barbecue, Southern heritage
Cozy Corner | Barbecue, Soul
Overton Park | Family, Road trips
Memphis Zoo | Family
Memphis Brooks Museum of Art | Glamour, Sunday best
Orpheum Theatre | Musical, Glamour, Dance halls
Tom Lee Park | Family, Road trips
Shelby Farms Park | Family, Road trips
Mud Island River Park | Family, Road trips
Dixon Gallery and Gardens | Glamour, Sunday best
Memphis Botanic Garden | Family, Sunday best
Memphis Pink Palace Museum | Family, Southern heritage
Levitt Shell | Rock and roll, Country, Family
Rock 'n' Soul Museum | Soul, Rock and roll, Memphis sound
Huey's | Family, Southern heritage
Lenny's Sub Shop | Family
Mississippi River Museum | Family, Road trips
`,
  brand: `
Coca-Cola | Family, Road trips
Pepsi | Family, Road trips
Dr Pepper | Southern heritage, Family
Kodak | Family, Road trips
Sears | Family, Sunday best
Woolworth's | Family, Sunday best
Singer | Family
Zenith | Family, Easy listening
RCA Victor | Traditional pop, Easy listening
Polaroid | Family, Road trips
Tupperware | Family, Barbecue
Revlon | Glamour
Max Factor | Glamour
Avon | Glamour, Family
Ivory Soap | Family
Crisco | Southern heritage, Family
Campbell's | Family
Betty Crocker | Family, Barbecue
Jell-O | Family, Sunday best
Hershey's | Family
Maxwell House | Family, Southern heritage
Chevrolet | Road trips
Ford | Road trips
Buick | Road trips, Glamour
Cadillac | Glamour, Rock and roll
Kellogg's | Family
Hoover | Family
Maytag | Family
Hallmark | Family, Sunday best
Pan Am | Glamour, Road trips
Greyhound | Road trips
Holiday Inn | Road trips, Southern heritage
Piggly Wiggly | Southern heritage, Family
`,
};
