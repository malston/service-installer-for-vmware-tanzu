/*
 * Copyright 2021 VMware, Inc
 * SPDX-License-Identifier: BSD-2-Clause
 */
/**
 * Angular Modules
 */
import { Component, Input, OnInit } from '@angular/core';
import {
    FormControl,
    Validators,
} from '@angular/forms';

/**
 * App imports
 */
import { StepFormDirective } from 'src/app/views/landing/wizard/shared/step-form/step-form';
import { APIClient } from 'src/app/swagger/api-client.service';
import { Subscription } from "rxjs";
import { VsphereTkgsService } from "src/app/shared/service/vsphere-tkgs-data.service";
@Component({
    selector: 'app-storage-policy-step',
    templateUrl: './storage-policy.component.html',
    styleUrls: ['./storage-policy.component.scss']
})
export class StoragePolicyComponent extends StepFormDirective implements OnInit {
    @Input() errorNotification: any;

    subscription: Subscription;
    private uploadStatus = false;
    private masterStoragePolicy;
    private ephemeralStoragePolicy;
    private imageStoragePolicy;
    public storagePolicies = ['Policy-1', 'Policy-2', 'Policy-3'];

    public masterPolicyErrorMsg = 'Provided Master Storage Policy is not found, please select one from drop-down';
    public ephemeralPolicyErrorMsg = 'Provided Ephemeral Storage Policy is not found, please select one from drop-down';
    public imagePolicyErrorMsg = 'Provided Image Storage Policy is not found, please select one from drop-down';

    constructor(public apiClient: APIClient,
                private dataService: VsphereTkgsService) {

        super();
    }
    ngOnInit() {
        super.ngOnInit();
        this.formGroup.addControl(
            'masterStoragePolicy',
            new FormControl('', [
                Validators.required
        ]));
        this.formGroup.addControl(
            'ephemeralStoragePolicy',
            new FormControl('', [
                Validators.required
        ]));
        this.formGroup.addControl(
            'imageStoragePolicy',
            new FormControl('', [
                Validators.required
        ]));
        setTimeout(_ => {
            this.resurrectField('masterStoragePolicy',
            [Validators.required],
            this.formGroup.get('masterStoragePolicy').value);
            this.resurrectField('ephemeralStoragePolicy',
            [Validators.required],
            this.formGroup.get('ephemeralStoragePolicy').value);
            this.resurrectField('imageStoragePolicy',
            [Validators.required],
            this.formGroup.get('imageStoragePolicy').value);

            this.formGroup.get('masterStoragePolicy').valueChanges.subscribe(
                () => this.apiClient.masterPolicyError = false);
            this.formGroup.get('ephemeralStoragePolicy').valueChanges.subscribe(
                () => this.apiClient.ephemeralPolicyError = false);
            this.formGroup.get('imageStoragePolicy').valueChanges.subscribe(
                () => this.apiClient.imagePolicyError = false);

            this.subscription = this.dataService.currentInputFileStatus.subscribe(
                (uploadStatus) => this.uploadStatus = uploadStatus);
            if (this.uploadStatus) {
                this.subscription = this.dataService.currentMasterStoragePolicy.subscribe(
                    (masterStoragePolicy) => this.masterStoragePolicy = masterStoragePolicy);
                if (this.apiClient.storagePolicies.indexOf(this.masterStoragePolicy) === -1) {
                    this.apiClient.masterPolicyError = true;
                } else {
                    this.apiClient.masterPolicyError = false;
                    this.formGroup.get('masterStoragePolicy').setValue(this.masterStoragePolicy);
                }
                this.subscription = this.dataService.currentEphemeralStoragePolicy.subscribe(
                    (ephemeralStoragePolicy) => this.ephemeralStoragePolicy = ephemeralStoragePolicy);
                if (this.apiClient.storagePolicies.indexOf(this.ephemeralStoragePolicy) === -1) {
                    this.apiClient.ephemeralPolicyError = true;
                } else {
                    this.apiClient.ephemeralPolicyError = false;
                    this.formGroup.get('ephemeralStoragePolicy').setValue(this.ephemeralStoragePolicy);
                }
                this.subscription = this.dataService.currentImageStoragePolicy.subscribe(
                    (imageStoragePolicy) => this.imageStoragePolicy = imageStoragePolicy);
                if (this.apiClient.storagePolicies.indexOf(this.imageStoragePolicy) === -1) {
                    this.apiClient.imagePolicyError = true;
                } else {
                    this.apiClient.imagePolicyError = false;
                    this.formGroup.get('imageStoragePolicy').setValue(this.imageStoragePolicy);
                }
            }
        });
    }
}
