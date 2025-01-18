## **Overview**

**`rtlayer-client`** is a frontend JavaScript library that makes it easy to integrate real-time messaging into your web applications. With its lightweight and efficient API, this library enables you to subscribe to real-time events, listen for updates, and manage event listeners seamlessly.

This documentation will guide you through **installation**, **initialization**, and demonstrate how to listen for and manage real-time events.

---

## **Installation**

To install the **`rtlayer-client`** package, use npm or yarn:

```bash
npm install rtlayer-client
# or
yarn add rtlayer-client
```
## **Usage**

### **1. Initializing RTLayer**

To use the **`rtlayer-client`** library, you need to initialize an instance of the **`RTLayer`** class with your **Organization ID (`oid`)** and **Service ID (`sid`)**. These credentials are available in your RTLayer account.

#### **Example**

```javascript
import RTLayer from 'rtlayer-client';

const oid = "lyvSfW7uPPolwax0BHMC"; // Replace with your Organization ID
const sid = "scz8W6qP7flVprZE6vRD"; // Replace with your Service ID

const rtlayer = new RTLayer(oid, sid);

export default rtlayer;
```
**Note:** The **`"use client"`** directive is required when using React Server Components to ensure the library operates on the client side.

### **2. Listening for Events**

The **`on`** method allows you to subscribe to events. You can listen for specific events by their name or use the wildcard (`*`) to listen to all events.

```javascript
import rtlayer from '@/lib/rtlayer';

rtlayer.on("*", (message) => {
    console.log("Received event:", message);
});
```

```javascript
import rtlayer from '@/lib/rtlayer';

const newsListener = rtlayer.on("news", (message) => {
    console.log("News event received:", message);
});
```


### **Example Usage**

Here’s a complete example demonstrating initialization, subscribing to events, and removing listeners:

```javascript

import RTLayer from 'rtlayer-client';

// Initialize RTLayer
const oid = "lyvSfW7uPPolwax0BHMC"; // Replace with your Organization ID
const sid = "scz8WW6qP7flVprZE6vRD"; // Replace with your Service ID
const rtlayer = new RTLayer(oid, sid);

// Listen for all events
rtlayer.on("*", (message) => {
    console.log("Event received:", message);
});

// Listen for specific 'news' events
const newsListener = rtlayer.on("news", (message) => {
    console.log("News event received:", message);
});

// Remove the listener for 'news' events
newsListener.remove();

```
### **React Example**
```javascript
  useEffect(() => {
    if (user) {
      console.log(`Listening for messages for user: ${user.name}`);

      // Listen for messages on a specific channel
      const userChannel = `user-${user.id}`;
      const listener = rtlayer.on(userChannel, (message) => {
        console.log("User message received:", message);
      });

      // Cleanup listener on component unmount or when user changes
      return () => {
        console.log(`Stopping listener for user: ${user.name}`);
        listener.remove();
      };
    }
  }, [user]);
```
## **Best Practices**

- **Optimize Performance:** Remove unused listeners using the **`remove`** method to prevent memory leaks and optimize performance.  
- **React Compatibility:** Use the **`"use client"`** directive in React projects with mixed server and client components to ensure the library functions on the client side.

---

## **Conclusion**

The **`rtlayer-client`** library provides a simple yet powerful way to add real-time functionality to your frontend applications. Whether you're building live notifications, chat systems, or event-driven features, this library simplifies the integration process.

Start using **`rtlayer-client`** today to bring your applications to life with real-time capabilities!
