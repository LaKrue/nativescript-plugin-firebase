var appModule = require("application");
var firebase = require("./firebase-common");

firebase.toHashMap = function(obj) {
  var node = new java.util.HashMap();
  for (var property in obj) {
    if (obj.hasOwnProperty(property)) {
      if (obj[property] != null) {
        switch (typeof obj[property]) {
          case 'object':
            node.put(property, firebase.toHashMap(obj[property], node));
            break;
          case 'boolean':
            node.put(property, java.lang.Boolean.valueOf(String(obj[property])));
            break;
          case 'number':
            if (Number(obj[property]) === obj[property] && obj[property] % 1 === 0)
              node.put(property, java.lang.Long.valueOf(String(obj[property])));
            else
              node.put(property, java.lang.Double.valueOf(String(obj[property])));
            break;
          case 'string':
            node.put(property, String(obj[property]));
            break;
        }
      }
    }
  }
  return node;
};

firebase.toJsObject = function(javaObj) {
  if (javaObj == null || typeof javaObj != "object") {
    return javaObj;
  }

  var node;
  switch (javaObj.getClass().getName()) {
    case 'java.lang.Boolean':
      return Boolean(String(javaObj));
      break;
    case 'java.lang.Long':
    case 'java.lang.Double':
      return Number(String(javaObj));
      break;
    case 'java.util.ArrayList':
      node = [];
      for (var i = 0; i < javaObj.size(); i++) {
        node[i] = firebase.toJsObject(javaObj.get(i));
      }
      break;
    default:
      node = {};
      var iterator = javaObj.entrySet().iterator();
      while (iterator.hasNext()) {
        item = iterator.next();
        switch (item.getClass().getName()) {
          case 'java.util.HashMap$HashMapEntry':
            node[item.getKey()] = firebase.toJsObject(item.getValue());
            break;
          case 'java.lang.String':
            node[item.getKey()] = String(item.getValue());
            break;
          case 'java.lang.Boolean':
            node[item.getKey()] = Boolean(String(item.getValue()));
            break;
          case 'java.lang.Long':
          case 'java.lang.Double':
            node[item.getKey()] = Number(String(item.getValue()));
            break;
          default:
            node[item.getKey()] = item.getValue();
        }
      }
  }
  return node;
};

firebase.getCallbackData = function(type, snapshot) {
  return {
    type: type,
    key: snapshot.getKey(),
    value: firebase.toJsObject(snapshot.getValue())
  }
};

firebase.init = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var Firebase = com.firebase.client.Firebase;
      Firebase.setAndroidContext(appModule.android.context);
      instance = new Firebase(arg.url);
      resolve();
    } catch (ex) {
      console.log("Error in firebase.store: " + ex);
      reject(ex);
    }
  });
};

firebase.addChildEventListener = function (updateCallback, path) {
  return new Promise(function (resolve, reject) {
    try {
      instance.child(path).addChildEventListener(new com.firebase.client.ChildEventListener({
            onChildAdded: function (snapshot, previousChildKey) {
              updateCallback(firebase.getCallbackData('ChildAdded', snapshot));
            },
            onChildRemoved: function (snapshot) {
              updateCallback(firebase.getCallbackData('ChildRemoved', snapshot));
            },
            onChildChanged: function (snapshot, previousChildKey) {
              updateCallback(firebase.getCallbackData('ChildChanged', snapshot));
            },
            onChildMoved: function (snapshot, previousChildKey) {
              updateCallback(firebase.getCallbackData('ChildMoved', snapshot));
            }
          })
      );
      resolve();
    } catch (ex) {
      console.log("Error in firebase.addChildEventListener: " + ex);
      reject(ex);
    }
  });
};

firebase.addValueEventListener = function (updateCallback, path) {
  return new Promise(function (resolve, reject) {
    try {
      var ValueEventListener = com.firebase.client.ValueEventListener;
      instance.child(path).addValueEventListener(new ValueEventListener({
            onDataChange: function (snapshot) {
              updateCallback(firebase.getCallbackData('ValueChanged', snapshot));
            },
            onCancelled: function (firebaseError) {
              updateCallback({
                error: firebaseError,
                errorMessage: firebaseError.message
              });
            }
          })
      );
      resolve();
    } catch (ex) {
      console.log("Error in firebase.store: " + ex);
      reject(ex);
    }
  });
};

firebase.push = function (path, val) {
  return new Promise(function (resolve, reject) {
    try {
      instance.child(path).push().setValue(firebase.toHashMap(val));
      resolve();
    } catch (ex) {
      console.log("Error in firebase.push: " + ex);
      reject(ex);
    }
  });
};

firebase.setValue = function (path, val) {
  return new Promise(function (resolve, reject) {
    try {
      instance.child(path).setValue(firebase.toHashMap(val));
      resolve();
    } catch (ex) {
      console.log("Error in firebase.setValue: " + ex);
      reject(ex);
    }
  });
};

firebase.remove = function (path) {
  return new Promise(function (resolve, reject) {
    try {
      instance.child(path).setValue(null);
      resolve();
    } catch (ex) {
      console.log("Error in firebase.remove: " + ex);
      reject(ex);
    }
  });
};

module.exports = firebase;