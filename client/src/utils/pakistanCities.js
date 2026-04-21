// List of major Pakistani cities for the Discover filter autocomplete.
// Kept as a flat string array — sorted alphabetically so suggestions feel
// predictable. Add/trim as needed; the <input>+dropdown only renders the
// first 8 matches so the list can grow without UI cost.
export const PAKISTAN_CITIES = [
  'Abbottabad', 'Attock', 'Badin', 'Bahawalnagar', 'Bahawalpur', 'Bannu',
  'Bhakkar', 'Bhimber', 'Burewala', 'Chakwal', 'Chaman', 'Charsadda',
  'Chiniot', 'Chitral', 'Dadu', 'Daska', 'Dera Ghazi Khan', 'Dera Ismail Khan',
  'Faisalabad', 'Ghotki', 'Gilgit', 'Gujar Khan', 'Gujranwala', 'Gujrat',
  'Gwadar', 'Hafizabad', 'Hangu', 'Haripur', 'Hasilpur', 'Haveli Lakha',
  'Hub', 'Hyderabad', 'Islamabad', 'Jacobabad', 'Jamshoro', 'Jatoi',
  'Jauharabad', 'Jhang', 'Jhelum', 'Kamoke', 'Karachi', 'Kasur',
  'Khairpur', 'Khanewal', 'Khanpur', 'Kharian', 'Khushab', 'Khuzdar',
  'Kohat', 'Kot Adu', 'Kotli', 'Lahore', 'Lakki Marwat', 'Larkana',
  'Layyah', 'Lodhran', 'Loralai', 'Mandi Bahauddin', 'Mansehra', 'Mardan',
  'Matiari', 'Mian Channu', 'Mianwali', 'Mingora', 'Mirpur', 'Mirpur Khas',
  'Multan', 'Murree', 'Muzaffarabad', 'Muzaffargarh', 'Narowal', 'Naushahro Feroze',
  'Nawabshah', 'Nowshera', 'Okara', 'Pakpattan', 'Peshawar', 'Quetta',
  'Rahim Yar Khan', 'Rawalpindi', 'Sadiqabad', 'Sahiwal', 'Sanghar', 'Sargodha',
  'Sheikhupura', 'Shikarpur', 'Sialkot', 'Sibi', 'Skardu', 'Sukkur',
  'Swabi', 'Swat', 'Tando Adam', 'Tando Allahyar', 'Tando Muhammad Khan',
  'Thatta', 'Toba Tek Singh', 'Turbat', 'Vehari', 'Wah Cantt', 'Wazirabad',
  'Zhob',
];

// Case-insensitive starts-with / contains search. Starts-with hits rank first.
export const searchCities = (query, limit = 8) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const c of PAKISTAN_CITIES) {
    const lc = c.toLowerCase();
    if (lc.startsWith(q)) starts.push(c);
    else if (lc.includes(q)) contains.push(c);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
};
