import axios from "axios";

// @desc Get filtered mandi prices
// @route GET /api/prices

const getMarketPrices = async (req, res) => {
  try {
    const API_KEY = process.env.DATA_GOV_API_KEY;

    // Query params
    const state = req.query.state || "";
    const district = req.query.district || "";
    const commodity = req.query.commodity || "";

    // Base URL
    let url =
      `https://api.data.gov.in/resource/` +
      `9ef84268-d588-465a-a308-a864a43d0070` +
      `?api-key=${API_KEY}` +
      `&format=json` +
      `&limit=20`;

    // Add filters dynamically
    if (state) {
      url += `&filters[state]=${encodeURIComponent(state)}`;
    }

    if (district) {
      url += `&filters[district]=${encodeURIComponent(district)}`;
    }

    if (commodity) {
      url += `&filters[commodity]=${encodeURIComponent(commodity)}`;
    }

    // Fetch data
    const response = await axios.get(url);

    const records = response.data.records;

    // Format response
    const formattedData = records.map((item) => ({
      state: item.state,
      district: item.district,
      market: item.market,
      commodity: item.commodity,
      variety: item.variety,
      arrivalDate: item.arrival_date,
      minPrice: item.min_price,
      maxPrice: item.max_price,
      modalPrice: item.modal_price,
    }));

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch market prices",
    });
  }
};

export { getMarketPrices };