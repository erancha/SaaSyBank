import appConfigData from '../appConfig.json';

// Get all accounts grouped by user:
// [
//   {
//       "user_id": "43e4c8a2-4081-70d9-613a-244f8f726307",
//       "user_name": "Betty User",
//       "accounts": [
//           {
//               "account_id": "39e49084-f32d-49bf-9d47-40c1dad9c06c"
//           },
//           {
//               "account_id": "dfa72097-597b-4199-b44d-70c96e3070d6"
//           }
//       ]
//   }
// ]
export const getAllAccountsByUserId = async () => {
  const url = `${appConfigData.REST_API_URL}/accounts/grouped`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log(`${url}: Accounts data: ${JSON.stringify(data, null, 2)}`);
    return data.payload;
  } catch (error) {
    console.error(`Error fetching accounts from ${url}:`, error);
    throw error;
  }
};
