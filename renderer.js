const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid').default;
const Btc = require('@ledgerhq/hw-app-btc').default;
let transport, btcApp;
let accountCount = 1;
let addressesPerAccount = 0;
// Array to keep track of which accounts have been derived already
let derivedAccounts = [];
let derivedAddresses = new Set();

document.getElementById('connectButton').addEventListener('click', async () => {
    try {
        if (transport) {
            await transport.close();
        }
        transport = await TransportNodeHid.create();
        btcApp = new Btc({ transport, currency: "horizen" });
        alert('Ledger connected successfully!');
        deriveAccounts();
    } catch (error) {
        console.error(error);
        alert('Failed to connect to Ledger: ' + error.message);
    }
});

document.getElementById('addAccountButton').addEventListener('click', () => {
    accountCount++;
    deriveAccounts();
});

document.getElementById('addAddressButton').addEventListener('click', async () => {
    addressesPerAccount++;
    const selectedAccount = document.getElementById('accountSelect').value;
    if (selectedAccount !== '') {
        const newOption = await deriveAddresses(parseInt(selectedAccount));
        // Automatically select the newly added address
        if (newOption) {
            document.getElementById('addressSelect').value = newOption.value;
        }
    }
});

async function deriveAccounts() {
    const accountSelect = document.getElementById('accountSelect');
    accountSelect.innerHTML = '<option value="">-- Select an account --</option>';
    for (let i = 0; i < accountCount; i++) {
        await addAccountOption(i);
    }
    // If the first account has not been derived yet, derive it
    if (!derivedAccounts.includes(0)) {
        await deriveAddresses(0);
        derivedAccounts.push(0); // Mark the first account as derived
    }
}


async function addAccountOption(accountIndex) {
    try {
        const path = `44'/121'/${accountIndex}`;
        const response = await btcApp.getWalletXpub({ path: path, xpubVersion: 0x0488b21e });
        console.log(response);
        const accountSelect = document.getElementById('accountSelect');
        const option = document.createElement('option');
        option.value = accountIndex;
        option.textContent = `Account ${accountIndex} - ${response}`;
        accountSelect.appendChild(option);
        if (accountCount === 1) {
            // Automatically select the first account
            accountSelect.value = accountIndex;
        }
    } catch (error) {
        console.error(error);
        alert('Failed to derive account.');
    }
}

async function deriveAddresses(accountIndex) {
    const addressSelect = document.getElementById('addressSelect');
    let lastOption = null; // To keep track of the last option added

    for (let i = 0; i < addressesPerAccount; i++) {
        try {
            const path = `44'/121'/${accountIndex}'/0/${i}`;
            const response = await btcApp.getWalletPublicKey(path, { format: "legacy" });

            // Check if the address has already been derived
            if (!derivedAddresses.has(response.bitcoinAddress)) {
                console.log(response);
                const option = document.createElement('option');
                option.value = JSON.stringify({ path: path, address: response.bitcoinAddress });
                //option.textContent = `Address ${i} - ${response.bitcoinAddress}`;
                option.textContent = `Account ${accountIndex} - Address ${i} - ${response.bitcoinAddress} -  Path ${path} `;
                addressSelect.appendChild(option);

                derivedAddresses.add(response.bitcoinAddress); // Mark the address as derived
                lastOption = option; // Update the last option added to the select element
            }
        } catch (error) {
            console.error(`Error deriving address ${i} for account ${accountIndex}:`, error);
        }
        // Add a small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return lastOption; // Return the last option added to the select element
}

async function deriveAddress(accountIndex, addressIndex) {
    try {
        const path = `44'/121'/${accountIndex}'/0/${addressIndex}`;
        const response = await btcApp.getWalletPublicKey(path, { format: "legacy" });
        console.log(response);
        const addressSelect = document.getElementById('addressSelect');
        const option = document.createElement('option');
        option.value = JSON.stringify({ path: path, address: response.bitcoinAddress });
        option.textContent = `Address ${addressIndex} - ${response.bitcoinAddress}`;
        addressSelect.appendChild(option);
        return option; // Return the newly created option
    } catch (error) {
        console.error(`Error deriving address ${addressIndex} for account ${accountIndex}:`, error);
        throw error; // Re-throw the error so it can be handled in deriveAddresses
    }
}

document.getElementById('signMessageButton').addEventListener('click', async () => {
    const selectedAccount = document.getElementById('accountSelect').value;
    const selectedAddress = document.getElementById('addressSelect').value;
    if (selectedAccount !== '' && selectedAddress) {
        const addressData = JSON.parse(selectedAddress);
        const message = document.getElementById('messageInput').value;

        btcApp.signMessage(addressData.path, Buffer.from(message).toString("hex")).then(function(result) {
            var v = result['v'] + 27 + 4;
            var signature = Buffer.from(v.toString(16) + result['r'] + result['s'], 'hex').toString('base64');

            addSignature(`Address: ${addressData.address} - Message: ${signature}`);
        })
    } else {
        alert('Please select an account and address.');
    }
});

function addSignature(signature) {
    const signaturesList = document.getElementById('signatures');
    const li = document.createElement('li');
    li.textContent = signature;
    signaturesList.appendChild(li);

    // Remove placeholder if it exists
    const placeholder = signaturesList.querySelector('.placeholder');
    if (placeholder) {
        placeholder.remove();
    }
}