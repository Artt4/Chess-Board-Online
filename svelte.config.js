import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      // You can specify an output directory if needed; default is 'build'
      out: 'build'
    })
  }
};

export default config;
