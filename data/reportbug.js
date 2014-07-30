
var pageInfo = null;

function saveNameAndEmail() {
  var nameInput = document.getElementById('name-input');
  var emailInput = document.getElementById('email-input');

  if (!nameInput || !emailInput) {
    return;
  }

  localStorage.setItem('name', nameInput.value);
  localStorage.setItem('email', emailInput.value);
}

function restoreNameAndEmail() {
  var name = localStorage.getItem('name');
  var email = localStorage.getItem('email');

  if (!name || !email) {
    return;
  }

  var nameInput = document.getElementById('name-input');
  var emailInput = document.getElementById('email-input');

  if (!nameInput || !emailInput) {
    return;
  }

  nameInput.value = name;
  emailInput.value = email;
}

self.port.on('info', function(info) {
  pageInfo = info;
  loaded();
});

function loaded() {
  if (!pageInfo)
    return;

  restoreNameAndEmail();

  document.getElementById('url-input').value = pageInfo.tabUrl;
};

document.getElementById('bug-report-form').addEventListener('submit', function(e) {
  saveNameAndEmail();

  var data = {
    client: {
      name: document.getElementById('name-input').value || '',
      email: document.getElementById('email-input').value || '',
      url: document.getElementById('url-input').value || '',
      description: document.getElementById('description-text').value
    }
  }

  self.port.emit('post', data);

  // var xhr = new XMLHttpRequest();
  // xhr.open("POST", pageInfo.postUrl);
  // xhr.setRequestHeader('Content-Type', 'application/json');
  // xhr.onreadystatechange = function () {
  //   if (xhr.readyState == 4) {
  //     console.log("done! status " + xhr.status);
  //   }
  // }
  // xhr.send(JSON.stringify(data));

  e.preventDefault();

});

if (document.readyState === "complete") {
  loaded();
} else {
  window.addEventListener('load', loaded);
}

console.log("loaded content script");