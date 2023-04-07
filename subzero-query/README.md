## subZero Query

This is an example of how our library can be used to create a ETL pipeline for a data warehouse to be leveraged directly from Excel. The library is used to create a backend REST API that is then accessed by an Excel Add-into query data from various sources (multiple sqlite databases generated from csv files, private private PostgreSQL/ClickHouse databases).

To view the source code for the backend and the Excel Add-in and how to run it locally, visit the following links:
[github repo](https://github.com/subzerocloud/subzero-query)

For a live demo, follow the instructions below to install the SubZero Query Excel Add-in and see it in action (we have a live deployment of the service and add-in).

## SubZero Query Excel Add-in Installation Guide

The SubZero Query Excel Add-in is a powerful tool for querying data from various sources and integrating it into your Excel workbooks. This guide will walk you through the process of installing the add-in using the "Upload My Add-in" method in Excel 365 since the plugin is not yet available in the Office Store.


### Prerequisites

- A Microsoft 365 subscription with access to Excel.
### Installation Steps

- Open Excel
    
    Open Microsoft Excel Online.

- Access the Insert Tab

    In the Excel Ribbon, click on the "Insert" tab.

- Open the Office Add-ins Dialog

    In the "Add-ins" group, click on "Add-ins" to open the Office Add-ins dialog.

- Access "My Add-ins"

    In the Office Add-ins dialog, click on the "My Add-ins"and then "Upload My Add-in".


- Upload the SubZero Query Add-in Manifest
    
    Download the SubZero Query add-in manifest file from the link below and upload it to the Office Add-ins dialog.

    [manifest.xml](https://extension.subzero-query.subzero.cloud/manifest.xml)

    Notice! Uninstalling is a bit fiddly, see the instructions below before you do it.

- Uninstalling the Add-in
    Open developer tools, go to the "Storage" tab and delete the "subzero-query" key from the "Local Storage" section, expand "Local Storage", find "https://excel.officeapps.live.com", right click and select "Delete All". Then refresh the page and the add-in should be gone.
    
    

After the add-in is successfully installed, you will see the "SubZero Query" add-in in the "Home" tab of the Excel Ribbon.

Now that the SubZero Query Excel Add-in is installed, you can use it to query data from various sources and integrate the results into your Excel workbooks. Simply click on the "SubZero Query" button in the "Home" tab to open the add-in pane and start using its features.

Happy querying!